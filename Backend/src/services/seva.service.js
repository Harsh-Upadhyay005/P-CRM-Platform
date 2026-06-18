import { redisClient } from '../config/redis.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { classifyComplaint, detectLanguage } from './gemini.service.js';
import {
  COMPLAINT_CATEGORIES,
  getCategoryByName,
  getCategoriesForLanguage,
} from '../constants/complaintCategories.js';
import { createPublicComplaint, createComplaint } from './complaints.service.js';

const SESSION_TTL = 3600;
const DEFAULT_TENANT_SLUG = env.SEVA_DEFAULT_TENANT_SLUG || 'main-office';

/** In-memory fallback when Redis is unavailable or misconfigured */
const memorySessions = new Map();
let redisUnavailable = false;

function sessionKey(sessionId) {
  return `seva:session:${sessionId}`;
}

function readMemorySession(key) {
  const entry = memorySessions.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memorySessions.delete(key);
    return null;
  }
  return entry.data;
}

function writeMemorySession(key, session) {
  memorySessions.set(key, {
    data: session,
    expiresAt: Date.now() + SESSION_TTL * 1000,
  });
}

async function readSession(key) {
  if (redisClient && !redisUnavailable) {
    try {
      const raw = await redisClient.get(key);
      if (!raw) return readMemorySession(key);
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (error) {
      console.warn('[seva.service] Redis read failed, using in-memory sessions:', error.message);
      redisUnavailable = true;
    }
  }
  return readMemorySession(key);
}

async function writeSession(key, session) {
  writeMemorySession(key, session);

  if (redisClient && !redisUnavailable) {
    try {
      await redisClient.set(key, JSON.stringify(session), { ex: SESSION_TTL });
    } catch (error) {
      console.warn('[seva.service] Redis write failed, using in-memory sessions:', error.message);
      redisUnavailable = true;
    }
  }
}

export const ConversationState = {
  INITIAL: 'INITIAL',
  COLLECTING_NAME: 'COLLECTING_NAME',
  COLLECTING_PHONE: 'COLLECTING_PHONE',
  COLLECTING_LOCALITY: 'COLLECTING_LOCALITY',
  COLLECTING_DESCRIPTION: 'COLLECTING_DESCRIPTION',
  CLASSIFYING: 'CLASSIFYING',
  CONFIRMING: 'CONFIRMING',
  READY: 'READY',
  SUBMITTED: 'SUBMITTED',
};

function categoryDisplayName(categoryEn, language) {
  const cat = COMPLAINT_CATEGORIES.find((c) => c.en === categoryEn);
  if (!cat) return categoryEn;
  return language === 'hi' ? cat.hi : cat.en;
}

function resolveCategoryFromInput(input) {
  const trimmed = input.trim();
  const byNumber = Number(trimmed);
  if (!Number.isNaN(byNumber) && byNumber >= 1 && byNumber <= COMPLAINT_CATEGORIES.length) {
    return COMPLAINT_CATEGORIES[byNumber - 1]?.en ?? null;
  }
  return getCategoryByName(trimmed)?.en ?? null;
}

export async function getOrCreateSession(sessionId, userId = null, tenantId = null) {
  const key = sessionKey(sessionId);

  try {
    let session = await readSession(key);

    if (session) {
      await writeSession(key, session);
      return session;
    }

    session = {
      sessionId,
      userId: userId || null,
      tenantId: tenantId || null,
      tenantSlug: DEFAULT_TENANT_SLUG,
      language: 'en',
      state: ConversationState.INITIAL,
      messages: [],
      collectedData: {
        citizenName: null,
        citizenPhone: null,
        citizenEmail: null,
        locality: null,
        description: null,
        category: null,
        confidence: null,
      },
      classificationAttempts: 0,
      classificationHistory: [],
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    };

    await writeSession(key, session);
    return session;
  } catch (error) {
    console.error('[seva.service] Session error in getOrCreateSession:', error);
    throw new ApiError(503, 'Session service temporarily unavailable');
  }
}

export async function updateSession(session) {
  session.lastActivityAt = new Date().toISOString();
  const key = sessionKey(session.sessionId);

  try {
    await writeSession(key, session);
  } catch (error) {
    console.error(`[seva.service] Failed to update session ${session.sessionId}:`, error);
    throw new ApiError(503, 'Session service temporarily unavailable');
  }
}

export function addMessage(session, role, content) {
  session.messages.push({
    role,
    content,
    timestamp: new Date().toISOString(),
  });
}

export function isValidIndianPhone(phone) {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^[6-9]\d{9}$/.test(cleaned);
}

export async function handleCollectingName(session, userMessage) {
  const name = userMessage.trim();

  if (name.length < 2) {
    return session.language === 'hi'
      ? 'कृपया अपना पूरा नाम बताएं।'
      : 'Please provide your full name.';
  }

  session.collectedData.citizenName = name;
  session.state = ConversationState.COLLECTING_PHONE;

  return session.language === 'hi'
    ? `धन्यवाद ${name}। कृपया अपना मोबाइल नंबर बताएं।`
    : `Thank you ${name}. Please provide your mobile number.`;
}

export async function handleCollectingPhone(session, userMessage) {
  const phone = userMessage.trim();

  if (!isValidIndianPhone(phone)) {
    return session.language === 'hi'
      ? 'कृपया एक मान्य 10 अंकों का मोबाइल नंबर दर्ज करें।'
      : 'Please enter a valid 10-digit mobile number.';
  }

  session.collectedData.citizenPhone = phone.replace(/[\s\-()]/g, '');
  session.state = ConversationState.COLLECTING_LOCALITY;

  return session.language === 'hi'
    ? 'कृपया अपना इलाका या स्थान बताएं।'
    : 'Please provide your locality or area.';
}

export async function handleCollectingLocality(session, userMessage) {
  const locality = userMessage.trim();

  if (locality.length < 3) {
    return session.language === 'hi'
      ? 'कृपया एक मान्य स्थान बताएं।'
      : 'Please provide a valid locality.';
  }

  session.collectedData.locality = locality;
  session.state = ConversationState.COLLECTING_DESCRIPTION;

  return session.language === 'hi'
    ? 'कृपया अपनी शिकायत का विवरण दें।'
    : 'Please describe your complaint.';
}

export async function handleCollectingDescription(session, userMessage) {
  const description = userMessage.trim();

  if (description.length < 10) {
    return session.language === 'hi'
      ? 'कृपया अपनी शिकायत का विस्तृत विवरण दें (कम से कम 10 अक्षर)।'
      : 'Please provide a detailed description of your complaint (at least 10 characters).';
  }

  session.collectedData.description = description;
  session.state = ConversationState.CLASSIFYING;
  return handleClassifying(session);
}

export async function handleClassifying(session) {
  try {
    const result = await classifyComplaint(
      session.collectedData.description,
      session.language
    );

    session.classificationAttempts++;
    session.classificationHistory.push({
      suggestedCategory: result.suggestedCategory,
      confidence: result.confidence,
      timestamp: new Date().toISOString(),
    });

    session.collectedData.category = result.suggestedCategory;
    session.collectedData.confidence = result.confidence;
    session.state = ConversationState.CONFIRMING;

    const categoryLabel = categoryDisplayName(result.suggestedCategory, session.language);

    if (result.confidence >= 70) {
      return session.language === 'hi'
        ? `मैंने आपकी शिकायत को "${categoryLabel}" के रूप में वर्गीकृत किया है। क्या यह सही है? (हां/नहीं)`
        : `I have classified your complaint as "${categoryLabel}". Is this correct? (Yes/No)`;
    }

    const topCategories = session.classificationHistory
      .slice(-3)
      .map((h) => categoryDisplayName(h.suggestedCategory, session.language))
      .filter(Boolean);

    return session.language === 'hi'
      ? `मैं निश्चित नहीं हूं। कृपया निम्नलिखित में से चुनें:\n${topCategories.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nनंबर या श्रेणी का नाम टाइप करें।`
      : `I'm not certain. Please choose from:\n${topCategories.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nType the number or category name.`;
  } catch (error) {
    console.error(`[seva.service] Classification error for session ${session.sessionId}:`, error);

    session.state = ConversationState.CONFIRMING;
    session.collectedData.category = 'Other/General';
    session.collectedData.confidence = 0;

    const sample = getCategoriesForLanguage(session.language)
      .slice(0, 8)
      .map((c, i) => `${i + 1}. ${c.name}`)
      .join('\n');

    return session.language === 'hi'
      ? `स्वचालित वर्गीकरण उपलब्ध नहीं है। कृपया श्रेणी चुनें:\n${sample}\n\nनंबर या नाम टाइप करें।`
      : `Automatic classification is unavailable. Please choose a category:\n${sample}\n\nType the number or name.`;
  }
}

export async function handleConfirming(session, userMessage) {
  const message = userMessage.toLowerCase().trim();

  if (['yes', 'हां', 'हाँ', 'y'].includes(message)) {
    session.state = ConversationState.READY;
    const cat = categoryDisplayName(session.collectedData.category, session.language);

    return session.language === 'hi'
      ? `शिकायत सारांश:\nनाम: ${session.collectedData.citizenName}\nफोन: ${session.collectedData.citizenPhone}\nस्थान: ${session.collectedData.locality}\nविवरण: ${session.collectedData.description}\nश्रेणी: ${cat}\n\nक्या आप इसे सबमिट करना चाहते हैं? (हां/नहीं)`
      : `Complaint Summary:\nName: ${session.collectedData.citizenName}\nPhone: ${session.collectedData.citizenPhone}\nLocality: ${session.collectedData.locality}\nDescription: ${session.collectedData.description}\nCategory: ${cat}\n\nWould you like to submit this? (Yes/No)`;
  }

  if (['no', 'नहीं', 'n'].includes(message)) {
    const sample = getCategoriesForLanguage(session.language)
      .slice(0, 10)
      .map((c, i) => `${i + 1}. ${c.name}`)
      .join('\n');

    return session.language === 'hi'
      ? `कोई बात नहीं। सही श्रेणी चुनें:\n${sample}\n\nनंबर या नाम टाइप करें।`
      : `No problem. Choose the correct category:\n${sample}\n\nType the number or name.`;
  }

  const picked = resolveCategoryFromInput(userMessage);
  if (picked) {
    session.collectedData.category = picked;
    const cat = categoryDisplayName(picked, session.language);
    return session.language === 'hi'
      ? `श्रेणी "${cat}" चुनी गई। क्या यह सही है? (हां/नहीं)`
      : `Category set to "${cat}". Is this correct? (Yes/No)`;
  }

  return session.language === 'hi'
    ? 'कृपया "हां" या "नहीं" टाइप करें, या सही श्रेणी का नाम/नंबर दें।'
    : 'Please type "Yes" or "No", or provide the correct category number/name.';
}

export async function handleReady(session, userMessage, userId = null, userContext = null) {
  const message = userMessage.toLowerCase().trim();

  if (['no', 'नहीं', 'n'].includes(message)) {
    session.state = ConversationState.COLLECTING_DESCRIPTION;
    return session.language === 'hi'
      ? 'कोई बात नहीं। कृपया अपनी शिकायत का विवरण फिर से दें।'
      : 'No problem. Please describe your complaint again.';
  }

  if (!['yes', 'हां', 'हाँ', 'y'].includes(message)) {
    return session.language === 'hi'
      ? 'कृपया "हां" या "नहीं" टाइप करें।'
      : 'Please type "Yes" or "No".';
  }

  try {
    const complaintData = {
      citizenName: session.collectedData.citizenName,
      citizenPhone: session.collectedData.citizenPhone,
      citizenEmail: session.collectedData.citizenEmail || undefined,
      locality: session.collectedData.locality,
      description: session.collectedData.description,
      category: session.collectedData.category,
      tenantSlug: session.tenantSlug || DEFAULT_TENANT_SLUG,
    };

    const complaint =
      userId && userContext
        ? await createComplaint(complaintData, userContext)
        : await createPublicComplaint(complaintData);

    session.state = ConversationState.SUBMITTED;

    return session.language === 'hi'
      ? `आपकी शिकायत सफलतापूर्वक दर्ज की गई है।\n\nट्रैकिंग आईडी: ${complaint.trackingId}\n\nइस आईडी से अपनी शिकायत की स्थिति ट्रैक करें।`
      : `Your complaint has been filed successfully.\n\nTracking ID: ${complaint.trackingId}\n\nUse this ID to track your complaint status.`;
  } catch (error) {
    console.error(`[seva.service] Submit error for session ${session.sessionId}:`, error);
    const detail = error.message || 'Unknown error';
    return session.language === 'hi'
      ? `क्षमा करें, शिकायत सबमिट नहीं हो सकी: ${detail}\n\nकृपया पुनः "हां" टाइप करके प्रयास करें।`
      : `Sorry, could not submit your complaint: ${detail}\n\nPlease try again by typing "Yes".`;
  }
}

export async function processMessage(sessionId, userMessage, userId = null, tenantId = null, userContext = null) {
  const session = await getOrCreateSession(sessionId, userId, tenantId);

  if (session.state === ConversationState.INITIAL) {
    session.language = detectLanguage(userMessage);
    session.state = ConversationState.COLLECTING_NAME;
  }

  addMessage(session, 'user', userMessage);

  let response;

  switch (session.state) {
    case ConversationState.COLLECTING_NAME:
      response = await handleCollectingName(session, userMessage);
      break;
    case ConversationState.COLLECTING_PHONE:
      response = await handleCollectingPhone(session, userMessage);
      break;
    case ConversationState.COLLECTING_LOCALITY:
      response = await handleCollectingLocality(session, userMessage);
      break;
    case ConversationState.COLLECTING_DESCRIPTION:
      response = await handleCollectingDescription(session, userMessage);
      break;
    case ConversationState.CLASSIFYING:
      response = await handleClassifying(session);
      break;
    case ConversationState.CONFIRMING:
      response = await handleConfirming(session, userMessage);
      break;
    case ConversationState.READY:
      response = await handleReady(session, userMessage, userId, userContext);
      break;
    case ConversationState.SUBMITTED:
      response =
        session.language === 'hi'
          ? 'आपकी शिकायत पहले ही दर्ज हो चुकी है। नई शिकायत के लिए पेज रीफ्रेश करें।'
          : 'Your complaint is already submitted. Refresh the page to start a new one.';
      break;
    default:
      session.state = ConversationState.COLLECTING_NAME;
      response =
        session.language === 'hi'
          ? 'नमस्ते! कृपया अपना नाम बताएं।'
          : 'Hello! Please provide your name.';
  }

  addMessage(session, 'assistant', response);
  await updateSession(session);

  return {
    sessionId: session.sessionId,
    message: response,
    state: session.state,
    language: session.language,
  };
}
