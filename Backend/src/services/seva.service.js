import { redisClient } from '../config/redis.js';
import { ApiError } from '../utils/ApiError.js';

const SESSION_TTL = 3600; // 1 hour

/**
 * Conversation state enum defining all possible states in the chatbot flow
 */
export const ConversationState = {
  INITIAL: 'INITIAL',
  COLLECTING_NAME: 'COLLECTING_NAME',
  COLLECTING_PHONE: 'COLLECTING_PHONE',
  COLLECTING_LOCALITY: 'COLLECTING_LOCALITY',
  COLLECTING_DESCRIPTION: 'COLLECTING_DESCRIPTION',
  CLASSIFYING: 'CLASSIFYING',
  CONFIRMING: 'CONFIRMING',
  READY: 'READY',
  SUBMITTED: 'SUBMITTED'
};

/**
 * Get or create conversation session from Redis
 * @param {string} sessionId - Unique session identifier
 * @param {string|null} userId - Optional user ID for authenticated users
 * @param {string|null} tenantId - Optional tenant ID
 * @returns {Promise<Object>} Session object
 * @throws {ApiError} If Redis is unavailable
 */
export async function getOrCreateSession(sessionId, userId = null, tenantId = null) {
  if (!redisClient) {
    throw new ApiError(503, 'Session service temporarily unavailable');
  }

  const sessionKey = `seva:session:${sessionId}`;
  
  try {
    let session = await redisClient.get(sessionKey);
    
    if (session) {
      // Reset TTL on activity
      await redisClient.expire(sessionKey, SESSION_TTL);
      // Handle both string and object responses from Redis
      return typeof session === 'string' ? JSON.parse(session) : session;
    }
    
    // Create new session with initial state
    session = {
      sessionId,
      userId: userId || null,
      tenantId: tenantId || null,
      language: 'en', // Will be detected from first message
      state: ConversationState.INITIAL,
      messages: [],
      collectedData: {
        citizenName: null,
        citizenPhone: null,
        citizenEmail: null,
        locality: null,
        description: null,
        category: null,
        confidence: null
      },
      classificationAttempts: 0,
      classificationHistory: [],
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString()
    };
    
    await redisClient.set(sessionKey, JSON.stringify(session), { ex: SESSION_TTL });
    return session;
  } catch (error) {
    console.error('[seva.service] Redis error in getOrCreateSession:', error);
    throw new ApiError(503, 'Session service temporarily unavailable');
  }
}

/**
 * Update session in Redis and reset TTL
 * @param {Object} session - Complete session object to save
 * @returns {Promise<void>}
 * @throws {ApiError} If Redis is unavailable
 */
export async function updateSession(session) {
  if (!redisClient) {
    throw new ApiError(503, 'Session service temporarily unavailable');
  }

  session.lastActivityAt = new Date().toISOString();
  const sessionKey = `seva:session:${session.sessionId}`;
  
  try {
    // Store as JSON string with TTL reset to 3600 seconds
    await redisClient.set(sessionKey, JSON.stringify(session), { ex: SESSION_TTL });
  } catch (error) {
    console.error(`[seva.service] Failed to update session ${session.sessionId}:`, error);
    throw new ApiError(503, 'Session service temporarily unavailable');
  }
}

/**
 * Add message to session history
 * @param {Object} session - Session object to update
 * @param {string} role - Message role ('user' or 'assistant')
 * @param {string} content - Message content
 */
export function addMessage(session, role, content) {
  session.messages.push({
    role,
    content,
    timestamp: new Date().toISOString()
  });
}

/**
 * Validate Indian mobile phone number
 * Accepts 10-digit numbers starting with 6-9
 * Cleans spaces, dashes, and parentheses before validation
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid Indian phone number
 */
export function isValidIndianPhone(phone) {
  // Clean phone number by removing spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Validate pattern: starts with 6-9, followed by 9 digits (total 10 digits)
  const phonePattern = /^[6-9]\d{9}$/;
  return phonePattern.test(cleaned);
}

/**
 * Handle COLLECTING_NAME state
 * Validates name has at least 2 characters and stores it
 * @param {Object} session - Current session object
 * @param {string} userMessage - User's input message
 * @returns {Promise<string>} Response message for the user
 */
export async function handleCollectingName(session, userMessage) {
  const name = userMessage.trim();
  
  // Validate minimum name length
  if (name.length < 2) {
    return session.language === 'hi'
      ? 'कृपया अपना पूरा नाम बताएं।'
      : 'Please provide your full name.';
  }
  
  // Store name and transition to next state
  session.collectedData.citizenName = name;
  session.state = ConversationState.COLLECTING_PHONE;
  
  // Return bilingual prompt for phone number
  return session.language === 'hi'
    ? `धन्यवाद ${name}। कृपया अपना मोबाइल नंबर बताएं।`
    : `Thank you ${name}. Please provide your mobile number.`;
}

/**
 * Handle COLLECTING_PHONE state
 * Validates Indian phone format and stores it
 * @param {Object} session - Current session object
 * @param {string} userMessage - User's input message
 * @returns {Promise<string>} Response message for the user
 */
export async function handleCollectingPhone(session, userMessage) {
  const phone = userMessage.trim();
  
  // Validate Indian phone number format
  if (!isValidIndianPhone(phone)) {
    return session.language === 'hi'
      ? 'कृपया एक मान्य 10 अंकों का मोबाइल नंबर दर्ज करें।'
      : 'Please enter a valid 10-digit mobile number.';
  }
  
  // Store cleaned phone number and transition to next state
  session.collectedData.citizenPhone = phone.replace(/[\s\-\(\)]/g, '');
  session.state = ConversationState.COLLECTING_LOCALITY;
  
  // Return bilingual prompt for locality
  return session.language === 'hi'
    ? 'कृपया अपना इलाका या स्थान बताएं।'
    : 'Please provide your locality or area.';
}

/**
 * Handle COLLECTING_LOCALITY state
 * Validates locality has at least 3 characters and stores it
 * @param {Object} session - Current session object
 * @param {string} userMessage - User's input message
 * @returns {Promise<string>} Response message for the user
 */
export async function handleCollectingLocality(session, userMessage) {
  const locality = userMessage.trim();
  
  // Validate minimum locality length
  if (locality.length < 3) {
    return session.language === 'hi'
      ? 'कृपया एक मान्य स्थान बताएं।'
      : 'Please provide a valid locality.';
  }
  
  // Store locality and transition to next state
  session.collectedData.locality = locality;
  session.state = ConversationState.COLLECTING_DESCRIPTION;
  
  // Return bilingual prompt for complaint description
  return session.language === 'hi'
    ? 'कृपया अपनी शिकायत का विवरण दें।'
    : 'Please describe your complaint.';
}

/**
 * Handle COLLECTING_DESCRIPTION state
 * Validates description has at least 10 characters and stores it
 * Transitions to CLASSIFYING state after successful validation
 * @param {Object} session - Current session object
 * @param {string} userMessage - User's input message
 * @returns {Promise<string>} Response message for the user
 */
export async function handleCollectingDescription(session, userMessage) {
  const description = userMessage.trim();
  
  // Validate minimum description length
  if (description.length < 10) {
    return session.language === 'hi'
      ? 'कृपया अपनी शिकायत का विस्तृत विवरण दें।'
      : 'Please provide a detailed description of your complaint.';
  }
  
  // Store description and transition to classification state
  session.collectedData.description = description;
  session.state = ConversationState.CLASSIFYING;
  
  // Return acknowledgment message indicating classification will begin
  return session.language === 'hi'
    ? 'धन्यवाद। मैं आपकी शिकायत को वर्गीकृत कर रहा हूं...'
    : 'Thank you. I am classifying your complaint...';
}
