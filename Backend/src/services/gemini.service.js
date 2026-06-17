import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { COMPLAINT_CATEGORIES } from '../constants/complaintCategories.js';

const REQUEST_TIMEOUT = 10000; // 10 seconds

// Initialize Gemini AI client only if API key is available
let genAI = null;
if (env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

/**
 * Classify complaint description into one of 43 predefined categories
 * @param {string} description - The complaint description
 * @param {string} language - 'en' or 'hi'
 * @returns {Promise<{suggestedCategory: string, confidence: number}>}
 */
export async function classifyComplaint(description, language) {
  if (!genAI) {
    console.error('[gemini.service] Gemini API key not configured');
    throw new Error('Classification temporarily unavailable');
  }

  try {
    // Build category list for the prompt
    const categoryList = COMPLAINT_CATEGORIES
      .map(cat => `${cat.key}: ${language === 'hi' ? cat.hindiLabel : cat.label}`)
      .join('\n');

    // Build language-specific prompt
    const prompt = language === 'hi'
      ? `यह एक शिकायत विवरण है: "${description}"
      
निम्नलिखित श्रेणियों में से एक चुनें जो इस शिकायत से सबसे अच्छी तरह मेल खाती हो:

${categoryList}

JSON प्रारूप में जवाब दें:
{
  "suggestedCategory": "CATEGORY_KEY",
  "confidence": 0-100
}
`
      : `This is a complaint description: "${description}"
      
Choose one category from the following that best matches this complaint:

${categoryList}

Respond in JSON format:
{
  "suggestedCategory": "CATEGORY_KEY",
  "confidence": 0-100
}
`;

    // Get Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Generate content with timeout
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), REQUEST_TIMEOUT)
      )
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from markdown code blocks if present
    // Handles both ```json ... ``` and plain JSON responses
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/{[\s\S]*}/);
    if (!jsonMatch) {
      console.error('[gemini.service] Invalid response format:', text);
      throw new Error('Invalid response format');
    }
    
    const jsonText = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonText);
    
    // Validate response structure
    if (!parsed.suggestedCategory || typeof parsed.confidence !== 'number') {
      console.error('[gemini.service] Invalid response structure:', parsed);
      throw new Error('Invalid response structure');
    }

    // Validate that suggested category exists in our list
    const isValidCategory = COMPLAINT_CATEGORIES.some(
      cat => cat.key === parsed.suggestedCategory
    );
    
    if (!isValidCategory) {
      console.warn('[gemini.service] Invalid category suggested:', parsed.suggestedCategory);
      throw new Error('Invalid category suggested');
    }
    
    return {
      suggestedCategory: parsed.suggestedCategory,
      confidence: Number(parsed.confidence)
    };
  } catch (error) {
    console.error('[gemini.service] Classification error:', error.message);
    
    // Return user-friendly error message
    throw new Error('Classification temporarily unavailable');
  }
}

/**
 * Generate contextual response based on conversation state
 * @param {object} conversationContext - Current session data
 * @param {string} userMessage - User's latest message
 * @returns {Promise<string>} - Generated response
 */
export async function generateResponse(conversationContext, userMessage) {
  if (!genAI) {
    console.error('[gemini.service] Gemini API key not configured');
    // Return fallback response
    return conversationContext.language === 'hi'
      ? 'क्षमा करें, मैं अभी उपलब्ध नहीं हूं। कृपया कुछ समय बाद पुनः प्रयास करें।'
      : 'Sorry, I am temporarily unavailable. Please try again in a moment.';
  }

  try {
    const { state, language, collectedData } = conversationContext;
    
    const systemContext = language === 'hi'
      ? `आप एक सहायक चैटबॉट हैं जो नागरिकों को शिकायत दर्ज करने में मदद करते हैं। आप वर्तमान में ${state} अवस्था में हैं।`
      : `You are a helpful chatbot assisting citizens with filing complaints. You are currently in ${state} state.`;

    const prompt = `${systemContext}

Conversation History:
${conversationContext.messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

User: ${userMessage}

Collected Data So Far:
${JSON.stringify(collectedData, null, 2)}

Generate an appropriate response in ${language === 'hi' ? 'Hindi' : 'English'}.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), REQUEST_TIMEOUT)
      )
    ]);

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('[gemini.service] Response generation error:', error.message);
    
    // Fallback responses
    return conversationContext.language === 'hi'
      ? 'क्षमा करें, मैं अभी उपलब्ध नहीं हूं। कृपया कुछ समय बाद पुनः प्रयास करें।'
      : 'Sorry, I am temporarily unavailable. Please try again in a moment.';
  }
}

/**
 * Detect language from user message
 * @param {string} message - User's message
 * @returns {string} - 'en' or 'hi'
 */
export function detectLanguage(message) {
  // Simple heuristic: check for Devanagari script (Unicode range U+0900 to U+097F)
  const hindiPattern = /[\u0900-\u097F]/;
  return hindiPattern.test(message) ? 'hi' : 'en';
}
