import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { COMPLAINT_CATEGORIES } from '../constants/complaintCategories.js';

const REQUEST_TIMEOUT = 15000;
const GEMINI_MODEL = 'gemini-2.0-flash';

let genAI = null;
if (env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

/**
 * Classify complaint description into one of 43 predefined categories
 * @param {string} description
 * @param {string} language - 'en' or 'hi'
 * @returns {Promise<{suggestedCategory: string, confidence: number}>}
 */
export async function classifyComplaint(description, language) {
  if (!genAI) {
    console.error('[gemini.service] Gemini API key not configured');
    throw new Error('Classification temporarily unavailable');
  }

  try {
    const categoryList = COMPLAINT_CATEGORIES.map(
      (cat) => `${cat.id}. ${cat.en} (${cat.hi})`
    ).join('\n');

    const prompt =
      language === 'hi'
        ? `यह एक शिकायत विवरण है: "${description}"

निम्नलिखित श्रेणियों में से सबसे उपयुक्त एक चुनें:

${categoryList}

JSON प्रारूप में जवाब दें (suggestedCategory अंग्रेजी नाम होना चाहिए):
{
  "suggestedCategory": "English category name exactly as listed",
  "confidence": 0-100
}`
        : `This is a complaint description: "${description}"

Choose the single best matching category from this list:

${categoryList}

Respond in JSON format (suggestedCategory must be the exact English name from the list):
{
  "suggestedCategory": "English category name exactly as listed",
  "confidence": 0-100
}`;

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), REQUEST_TIMEOUT)
      ),
    ]);

    const text = result.response.text();
    const jsonMatch =
      text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/{[\s\S]*}/);

    if (!jsonMatch) {
      console.error('[gemini.service] Invalid response format:', text);
      throw new Error('Invalid response format');
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonText);

    if (!parsed.suggestedCategory || typeof parsed.confidence !== 'number') {
      throw new Error('Invalid response structure');
    }

    const matched = COMPLAINT_CATEGORIES.find(
      (cat) =>
        cat.en.toLowerCase() === String(parsed.suggestedCategory).toLowerCase()
    );

    if (!matched) {
      console.warn(
        '[gemini.service] Invalid category suggested:',
        parsed.suggestedCategory
      );
      throw new Error('Invalid category suggested');
    }

    return {
      suggestedCategory: matched.en,
      confidence: Number(parsed.confidence),
    };
  } catch (error) {
    console.error('[gemini.service] Classification error:', error.message);
    throw new Error('Classification temporarily unavailable');
  }
}

/**
 * Detect language from user message
 * @param {string} message
 * @returns {'en' | 'hi'}
 */
export function detectLanguage(message) {
  const hindiPattern = /[\u0900-\u097F]/;
  return hindiPattern.test(message) ? 'hi' : 'en';
}
