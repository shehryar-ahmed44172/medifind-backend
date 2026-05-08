import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger';

export const generateNotificationDraft = async (prompt: string) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback if no API key is provided
    if (!apiKey) {
      logger.warn('⚠️ No GEMINI_API_KEY found. Using mock AI response for development.');
      
      // Artificial delay to simulate AI thinking
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        title: 'Important Alert',
        body: `[MOCK DRAFT] Please be advised: ${prompt}. \n\nThank you for your cooperation.`,
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Prioritized list of models to try (Fallbacks)
    const modelsToTry = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-flash-latest',
      'gemini-1.5-flash',
      'gemini-pro-latest',
      'gemini-pro'
    ];

    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        logger.info(`🤖 Attempting draft generation with model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });

        const systemInstruction = `
          You are an expert emergency response communications assistant for the 'MediFind' platform.
          Your job is to draft concise, professional, and clear notification messages.
          The output must be formatted as exactly two lines:
          Line 1: The Title (Short, urgent if necessary, max 50 characters)
          Line 2: The Body (Clear, professional instructions, max 250 characters)
          
          Do not include any other text, markdown, or explanation.
          
          User Prompt: "${prompt}"
        `;

        const result = await model.generateContent(systemInstruction);
        const text = result.response.text().trim();
        
        // Split by newline and take first line as title, rest as body
        const parts = text.split('\n');
        const title = parts[0].replace(/^(Title:|Subject:)/i, '').trim() || 'System Alert';
        const body = parts.slice(1).join(' ').replace(/^(Body:|Message:)/i, '').trim() || text;

        logger.info(`✅ Successfully generated draft using ${modelName}`);
        return { title, body };

      } catch (error: any) {
        lastError = error;
        logger.warn(`⚠️ Model ${modelName} failed or limit exceeded: ${error.message}. Trying next fallback...`);
        continue; // Try next model
      }
    }

    // If we get here, all real models failed (Rate limits or 404s)
    logger.warn('❌ All real AI models exhausted or unavailable. Falling back to local mock generator to ensure service continuity.');
    
    return {
      title: 'Draft: System Notification',
      body: `[OFFLINE MODE] Due to high traffic, this draft was generated locally: "${prompt}". Please review and refine as needed.`,
    };

  } catch (error: any) {
    logger.error('AI Drafting Error:', error);
    // Final emergency fallback if even the loop crashes
    return {
      title: 'Notification Draft',
      body: `[FALLBACK] Draft for: "${prompt}". (Note: AI service is currently at capacity).`,
    };
  }
};
