import { redisClient } from '../config/redis.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { detectLanguage } from './gemini.service.js';
import {
  COMPLAINT_CATEGORIES,
  getCategoryByName,
  getCategoriesForLanguage,
} from '../constants/complaintCategories.js';
import { createPublicComplaint, createComplaint } from './complaints.service.js';

// Category templates with good descriptions
const CATEGORY_TEMPLATES = {
  "Water Supply": {
    keywords: ["paani", "water", "jal", "supply", "नल", "tap", "पानी", "nal"],
    template: (location) => `Water supply disruption reported at ${location}. Residents are facing difficulty in accessing clean drinking water. This requires immediate attention from the water department to restore normal supply and investigate the root cause of the interruption.`,
    priority: "HIGH"
  },
  "Electricity": {
    keywords: ["bijli", "electricity", "light", "बिजली", "power", "लाइट", "current", "करंट"],
    template: (location) => `Electricity outage reported at ${location}. The area is experiencing power supply issues affecting daily activities. Immediate inspection and restoration of power supply is requested from the electricity department.`,
    priority: "HIGH"
  },
  "Road Maintenance": {
    keywords: ["road", "sadak", "सड़क", "pothole", "गड्ढा", "रास्ता", "raasta", "gaddha", "गड्ढे"],
    template: (location) => `Road maintenance required at ${location}. The road condition has deteriorated, causing inconvenience to commuters and potential safety hazards. The public works department should inspect and carry out necessary repairs.`,
    priority: "MEDIUM"
  },
  "Garbage Collection": {
    keywords: ["kachra", "garbage", "कचरा", "waste", "safai", "कूड़ा", "kooda", "kuda", "gandagi", "गंदगी", "gandgi", "sanitation", "सफाई"],
    template: (location) => `Garbage collection issue reported at ${location}. Accumulated waste is causing unhygienic conditions and potential health hazards for residents. Regular garbage collection service needs to be resumed immediately.`,
    priority: "MEDIUM"
  },
  "Street Light": {
    keywords: ["street light", "बत्ती", "pole", "रोशनी", "streetlight", "batti", "roshni", "खंभा", "khamba", "light pole"],
    template: (location) => `Street lighting malfunction reported at ${location}. Non-functional street lights are causing safety concerns during night hours. The electrical maintenance team should inspect and repair the lighting infrastructure.`,
    priority: "MEDIUM"
  },
  "Drainage": {
    keywords: ["drainage", "नाली", "sewage", "overflow", "नाला", "naali", "nala", "gutter", "sewer", "जमाव"],
    template: (location) => `Drainage system issue reported at ${location}. Blockage or overflow is causing waterlogging and unhygienic conditions. The drainage department should clear the blockage and ensure proper sewage flow.`,
    priority: "HIGH"
  }
};

function classifyComplaintByKeywords(description, locality) {
  const messageLower = description.toLowerCase();
  const safeLocality = locality || 'the reported area';
  
  // Find matching category
  for (const [category, config] of Object.entries(CATEGORY_TEMPLATES)) {
    const hasMatch = config.keywords.some(keyword => 
      messageLower.includes(keyword.toLowerCase())
    );
    
    if (hasMatch) {
      return {
        suggestedCategory: category,
        description: config.template(safeLocality),
        priority: config.priority,
        confidence: 85
      };
    }
  }
  
  // Fallback for unmatched categories
  return {
    suggestedCategory: "Other/General",
    description: `Issue reported at ${safeLocality}: ${description}. This complaint requires attention from the relevant department to investigate and resolve the matter promptly.`,
    priority: "MEDIUM",
    confidence: 50
  };
}

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
  COLLECTING_DESCRIPTION: 'COLLECTING_DESCRIPTION',
  CLASSIFYING: 'CLASSIFYING',
  CONFIRMING: 'CONFIRMING',
  READY: 'READY',
  SUBMITTED: 'SUBMITTED',
};

function categoryDisplayName(categoryEn, language) {
  const cat = COMPLAINT_CATEGORIES.find((c) => c.en === categoryEn);
  if (!cat) return categoryEn;
  
  // For Hinglish and Hindi, show both English and Hindi names
  if (language === 'hi' || language === 'hinglish') {
    return `${cat.en} (${cat.hi})`;
  }
  
  return cat.en;
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
        locality: null,
        description: null,
        category: null,
        priority: null,
        confidence: null,
        latitude: null,
        longitude: null,
      },
      classificationAttempts: 0,
      classificationHistory: [],
      trackingId: null,
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

export async function handleCollectingLocality(session, userMessage) {
  const locality = userMessage.trim();

  if (locality.length < 3) {
    return session.language === 'hi'
      ? 'कृपया एक मान्य स्थान बताएं।'
      : 'Please provide a valid locality.';
  }

  session.collectedData.locality = locality;
  session.state = ConversationState.CLASSIFYING;
  return handleClassifying(session);
}

export async function handleCollectingDescription(session, userMessage) {
  const description = userMessage.trim();

  if (description.length < 5) {
    if (session.language === 'hi') {
      return 'कृपया अपनी शिकायत का संक्षिप्त विवरण दें (कम से कम 5 अक्षर)।';
    } else if (session.language === 'hinglish') {
      return 'Kripya apni complaint ka sankshipt vivran dijiye (kam se kam 5 letters).';
    } else {
      return 'Please provide a brief description of your complaint (at least 5 characters).';
    }
  }

  session.collectedData.description = description;
  
  // If we don't have locality from coordinates, ask for it
  if (!session.collectedData.locality) {
    session.state = ConversationState.COLLECTING_LOCALITY;
    if (session.language === 'hi') {
      return 'कृपया अपना इलाका या स्थान बताएं।';
    } else if (session.language === 'hinglish') {
      return 'Kripya apna area ya location batayein.';
    } else {
      return 'Please provide your locality or area.';
    }
  }
  
  session.state = ConversationState.CLASSIFYING;
  return handleClassifying(session);
}

export async function handleClassifying(session) {
  try {
    const result = classifyComplaintByKeywords(
      session.collectedData.description,
      session.collectedData.locality
    );

    session.classificationAttempts++;
    session.classificationHistory.push({
      suggestedCategory: result.suggestedCategory,
      confidence: result.confidence,
      timestamp: new Date().toISOString(),
    });

    session.collectedData.category = result.suggestedCategory;
    session.collectedData.confidence = result.confidence;
    session.collectedData.description = result.description; // Use generated description
    session.collectedData.priority = result.priority; // Use suggested priority
    session.state = ConversationState.CONFIRMING;

    const categoryLabel = categoryDisplayName(result.suggestedCategory, session.language);

    if (session.language === 'hi') {
      return `मैंने आपकी शिकायत को "${categoryLabel}" के रूप में वर्गीकृत किया है।\n\nक्या यह सही है? (हां/नहीं)`;
    } else if (session.language === 'hinglish') {
      return `Maine aapki complaint ko "${categoryLabel}" category mein classify kiya hai.\n\nKya yeh sahi hai? (yes/no)`;
    } else {
      return `I have classified your complaint as "${categoryLabel}".\n\nIs this correct? (Yes/No)`;
    }
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

  if (['yes', 'हां', 'हाँ', 'y', 'haan', 'ha'].includes(message)) {
    session.state = ConversationState.READY;
    const cat = categoryDisplayName(session.collectedData.category, session.language);

    if (session.language === 'hi') {
      return `📋 श्रेणी: ${cat}\n\nक्या आप इसे सबमिट करना चाहते हैं? (हां/नहीं)`;
    } else if (session.language === 'hinglish') {
      return `📋 Category: ${cat}\n\nKya aap ise submit karna chahte hain? (yes/no)`;
    } else {
      return `📋 Category: ${cat}\n\nWould you like to submit this? (Yes/No)`;
    }
  }

  if (['no', 'नहीं', 'n', 'nahi'].includes(message)) {
    const sample = getCategoriesForLanguage(session.language === 'hinglish' ? 'en' : session.language)
      .slice(0, 10)
      .map((c, i) => `${i + 1}. ${c.name}`)
      .join('\n');

    if (session.language === 'hi') {
      return `कोई बात नहीं। सही श्रेणी चुनें:\n${sample}\n\nनंबर या नाम टाइप करें।`;
    } else if (session.language === 'hinglish') {
      return `Koi baat nahi. Sahi category chuniye:\n${sample}\n\nNumber ya name type karein.`;
    } else {
      return `No problem. Choose the correct category:\n${sample}\n\nType the number or name.`;
    }
  }

  const picked = resolveCategoryFromInput(userMessage);
  if (picked) {
    session.collectedData.category = picked;
    const cat = categoryDisplayName(picked, session.language);
    
    if (session.language === 'hi') {
      return `श्रेणी "${cat}" चुनी गई।\n\nक्या यह सही है? (हां/नहीं)`;
    } else if (session.language === 'hinglish') {
      return `Category "${cat}" select hui.\n\nKya yeh sahi hai? (yes/no)`;
    } else {
      return `Category set to "${cat}".\n\nIs this correct? (Yes/No)`;
    }
  }

  if (session.language === 'hi') {
    return 'कृपया "हां" या "नहीं" टाइप करें, या सही श्रेणी का नाम/नंबर दें।';
  } else if (session.language === 'hinglish') {
    return 'Kripya "yes" ya "no" type karein, ya sahi category ka number/name dijiye.';
  } else {
    return 'Please type "Yes" or "No", or provide the correct category number/name.';
  }
}

export async function handleReady(session, userMessage, userId = null, userContext = null) {
  const message = userMessage.toLowerCase().trim();

  if (['no', 'नहीं', 'n', 'nahi'].includes(message)) {
    session.state = ConversationState.COLLECTING_DESCRIPTION;
    if (session.language === 'hi') {
      return 'कोई बात नहीं। कृपया अपनी शिकायत का विवरण फिर से दें।';
    } else if (session.language === 'hinglish') {
      return 'Koi baat nahi. Kripya apni complaint ka vivran phir se dijiye.';
    } else {
      return 'No problem. Please describe your complaint again.';
    }
  }

  if (!['yes', 'हां', 'हाँ', 'y', 'haan', 'ha'].includes(message)) {
    if (session.language === 'hi') {
      return 'कृपया "हां" या "नहीं" टाइप करें।';
    } else if (session.language === 'hinglish') {
      return 'Kripya "yes" ya "no" type karein.';
    } else {
      return 'Please type "Yes" or "No".';
    }
  }

  try {
    const complaintData = {
      citizenName: 'Anonymous',
      citizenPhone: '1818181818',
      citizenEmail: 'anonymous@xyz.com',
      locality: session.collectedData.locality,
      description: session.collectedData.description,
      category: session.collectedData.category,
      priority: session.collectedData.priority,
      tenantSlug: session.tenantSlug || DEFAULT_TENANT_SLUG,
      latitude: session.collectedData.latitude || null,
      longitude: session.collectedData.longitude || null,
    };

    const complaint =
      userId && userContext
        ? await createComplaint(complaintData, userContext)
        : await createPublicComplaint(complaintData);

    session.state = ConversationState.SUBMITTED;
    session.trackingId = complaint.trackingId;

    if (session.language === 'hi') {
      return `आपकी शिकायत सफलतापूर्वक दर्ज की गई है।\n\nट्रैकिंग आईडी: ${complaint.trackingId}\n\nइस आईडी से अपनी शिकायत की स्थिति ट्रैक करें।`;
    } else if (session.language === 'hinglish') {
      return `Aapki complaint successfully register ho gayi hai.\n\nTracking ID: ${complaint.trackingId}\n\nIs ID se apni complaint ki status track karein.`;
    } else {
      return `Your complaint has been filed successfully.\n\nTracking ID: ${complaint.trackingId}\n\nUse this ID to track your complaint status.`;
    }
  } catch (error) {
    console.error(`[seva.service] Submit error for session ${session.sessionId}:`, error);
    const detail = error.message || 'Unknown error';
    
    if (session.language === 'hi') {
      return `क्षमा करें, शिकायत सबमिट नहीं हो सकी: ${detail}\n\nकृपया पुनः "हां" टाइप करके प्रयास करें।`;
    } else if (session.language === 'hinglish') {
      return `Kshama karein, complaint submit nahi ho saki: ${detail}\n\nKripya phir se "yes" type karke try karein.`;
    } else {
      return `Sorry, could not submit your complaint: ${detail}\n\nPlease try again by typing "Yes".`;
    }
  }
}

export async function processMessage(sessionId, userMessage, userId = null, tenantId = null, userContext = null, coordinates = null) {
  const session = await getOrCreateSession(sessionId, userId, tenantId);

  // Store coordinates and get locality if provided (usually on first message)
  if (coordinates && coordinates.latitude && coordinates.longitude) {
    session.collectedData.latitude = coordinates.latitude;
    session.collectedData.longitude = coordinates.longitude;
    
    // TODO: Add reverse geocoding here to get locality from coordinates
    // For now, we'll get locality from Mappls reverse geocode API in frontend
    if (coordinates.locality) {
      session.collectedData.locality = coordinates.locality;
    }
  }

  if (session.state === ConversationState.INITIAL) {
    session.language = detectLanguage(userMessage);
    session.state = ConversationState.COLLECTING_DESCRIPTION;
  }

  addMessage(session, 'user', userMessage);

  let response;

  switch (session.state) {
    case ConversationState.COLLECTING_DESCRIPTION:
      response = await handleCollectingDescription(session, userMessage);
      break;
    case ConversationState.COLLECTING_LOCALITY:
      response = await handleCollectingLocality(session, userMessage);
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
      if (session.language === 'hi') {
        response = `आपकी शिकायत पहले ही दर्ज हो चुकी है।\n\nट्रैकिंग ID: ${session.trackingId}\n\nनई शिकायत के लिए पेज रीफ्रेश करें।`;
      } else if (session.language === 'hinglish') {
        response = `Aapki complaint pehle hi register ho chuki hai.\n\nTracking ID: ${session.trackingId}\n\nNayi complaint ke liye page refresh karein.`;
      } else {
        response = `Your complaint is already submitted.\n\nTracking ID: ${session.trackingId}\n\nRefresh the page to start a new one.`;
      }
      break;
    default:
      session.state = ConversationState.COLLECTING_DESCRIPTION;
      if (session.language === 'hi') {
        response = 'नमस्ते! मैं सेवा हूं। कृपया अपनी समस्या एक वाक्य में बताएं।\n\nउदाहरण: हमारे area में बिजली नहीं आ रही है';
      } else if (session.language === 'hinglish') {
        response = 'Namaste! Main Seva hoon. Kripya apni problem ek sentence mein batayein.\n\nExample: Hamare area me bijli nahi aa rahi hai';
      } else {
        response = 'Hello! I am Seva. Please describe your problem in one sentence.\n\nExample: There is no electricity in our area';
      }
  }

  addMessage(session, 'assistant', response);
  await updateSession(session);

  return {
    sessionId: session.sessionId,
    message: response,
    state: session.state,
    language: session.language,
    trackingId: session.trackingId,
  };
}
