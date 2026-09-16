import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger';

const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-flash-latest',
  'gemini-1.5-flash',
  'gemini-pro-latest',
  'gemini-pro',
];

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
    
    const modelsToTry = GEMINI_MODELS;

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

export const classifyEmergencySymptoms = async (symptoms: string): Promise<{
  emergencyType: string;
  confidence: number;
  reasoning: string;
}> => {
  const fallback = { emergencyType: 'OTHER', confidence: 0, reasoning: 'Classification unavailable' };
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return fallback;

    const genAI = new GoogleGenerativeAI(apiKey);
    const classifyPrompt = `You are a medical emergency classifier for the MediFind emergency response platform.
Given a patient's symptom description, classify the emergency type.

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{"emergencyType":"TYPE","confidence":0.0,"reasoning":"brief reason"}

Where TYPE must be exactly one of: CARDIAC, STROKE, TRAUMA, SEIZURE, DIABETIC, CHEST_PAIN, SHORTNESS_OF_BREATH, OTHER
confidence is a decimal between 0.0 and 1.0

Patient symptoms: "${symptoms}"`;

    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(classifyPrompt);
        const text = result.response.text().trim()
          .replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(text);
        if (parsed.emergencyType && typeof parsed.confidence === 'number') {
          logger.info(`[AI Classify] ${modelName} → ${parsed.emergencyType} (${parsed.confidence})`);
          return { emergencyType: parsed.emergencyType, confidence: parsed.confidence, reasoning: parsed.reasoning || '' };
        }
      } catch { continue; }
    }
    return fallback;
  } catch (err: any) {
    logger.error(`[AI Classify] Error: ${err.message}`);
    return fallback;
  }
};

export const generateVoiceSummary = async (params: {
  patientName: string;
  emergencyType: string;
  isDeaf: boolean;
  allergies: string[];
  chronicDiseases: string[];
  medications: string[];
  bloodType: string;
}): Promise<string> => {
  const { patientName, emergencyType, isDeaf, allergies, chronicDiseases, medications, bloodType } = params;
  const fallback =
    (isDeaf ? 'ATTENTION: PATIENT IS DEAF AND UNABLE TO SPEAK. ' : '') +
    `Emergency Type: ${emergencyType}. ` +
    (allergies.length > 0 ? `Patient has allergies: ${allergies.join(', ')}. ` : '') +
    (chronicDiseases.length > 0 ? `Chronic conditions: ${chronicDiseases.join(', ')}.` : '');

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return fallback;

    const genAI = new GoogleGenerativeAI(apiKey);
    const voicePrompt = `You are a medical dispatcher generating a spoken voice briefing for first responders en route to an emergency.
Generate a concise clinical briefing in 2-3 sentences maximum. Use clear, professional language suitable for spoken TTS audio.
${isDeaf ? 'IMPORTANT: Begin with exactly "ATTENTION: PATIENT IS DEAF AND UNABLE TO SPEAK."' : ''}

Patient: ${patientName}
Emergency Type: ${emergencyType}
Blood Type: ${bloodType}
Allergies: ${allergies.length > 0 ? allergies.join(', ') : 'None known'}
Chronic Conditions: ${chronicDiseases.length > 0 ? chronicDiseases.join(', ') : 'None known'}
Medications: ${medications.length > 0 ? medications.join(', ') : 'None known'}

Respond with plain text only — no markdown, no bullet points, no headers. Maximum 3 sentences.`;

    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(voicePrompt);
        const text = result.response.text().trim();
        if (text) {
          logger.info(`[AI VoiceSummary] Generated via ${modelName}`);
          return text;
        }
      } catch { continue; }
    }
    return fallback;
  } catch (err: any) {
    logger.error(`[AI VoiceSummary] Error: ${err.message}`);
    return fallback;
  }
};

export const generateDeafQuickReplies = async (params: {
  emergencyType: string;
  allergies: string[];
  chronicDiseases: string[];
  medications: string[];
  additionalInfo: string;
}): Promise<Array<{ icon: string; text: string }>> => {
  const { emergencyType, allergies, chronicDiseases, medications, additionalInfo } = params;
  const staticFallback = [
    { icon: 'emergency', text: 'I need immediate help!' },
    { icon: 'hearing_disabled', text: 'I am Deaf — use text chat.' },
    { icon: 'favorite', text: 'I have chest pain.' },
    { icon: 'air', text: 'I cannot breathe.' },
    { icon: 'bolt', text: 'I am having a seizure.' },
    { icon: 'local_hospital', text: 'Please call an ambulance.' },
    { icon: 'monitor_heart', text: 'I am diabetic — feeling faint.' },
    { icon: 'warning_amber', text: 'I have a drug allergy.' },
  ];

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return staticFallback;

    const genAI = new GoogleGenerativeAI(apiKey);
    const quickReplyPrompt = `You are generating emergency communication cards for a DEAF patient who cannot speak or hear.
The patient needs to tap a card to instantly send a message to their emergency responder.

Generate exactly 8 quick-reply phrases personalized to this patient's situation.
Always include "I am Deaf — use text chat." as the second phrase.
Make the other 7 specific to their emergency type and medical history.

Respond with ONLY valid JSON array (no markdown):
[{"icon":"material_icon_name","text":"short phrase"},...]

Available icon names: emergency, hearing_disabled, favorite, air, bolt, local_hospital, monitor_heart, warning_amber, medication, bloodtype, accessible, help, sick, thermostat

Patient Emergency Type: ${emergencyType}
Allergies: ${allergies.length > 0 ? allergies.join(', ') : 'None'}
Chronic Conditions: ${chronicDiseases.length > 0 ? chronicDiseases.join(', ') : 'None'}
Medications: ${medications.length > 0 ? medications.join(', ') : 'None'}
Additional Info: ${additionalInfo || 'None'}

Each text must be under 40 characters. Exactly 8 items. JSON array only.`;

    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(quickReplyPrompt);
        const text = result.response.text().trim()
          .replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length >= 4 && parsed[0].text) {
          logger.info(`[AI QuickReplies] Generated ${parsed.length} cards via ${modelName}`);
          return parsed;
        }
      } catch { continue; }
    }
    return staticFallback;
  } catch (err: any) {
    logger.error(`[AI QuickReplies] Error: ${err.message}`);
    return staticFallback;
  }
};

export const generateMedicalBrief = async (params: {
  patientName: string;
  emergencyType: string;
  bloodType: string;
  allergies: string[];
  chronicDiseases: string[];
  medications: string[];
  patientType: string;
  additionalInfo: string;
}): Promise<{ brief: string; criticalFlags: string[]; recommendedActions: string[] }> => {
  const { patientName, emergencyType, bloodType, allergies, chronicDiseases, medications, patientType, additionalInfo } = params;
  const fallback = {
    brief: `${emergencyType} emergency for ${patientName}. Blood type: ${bloodType}.`,
    criticalFlags: allergies.length > 0 ? [`Allergic to: ${allergies.join(', ')}`] : [],
    recommendedActions: ['Follow standard emergency protocol', "Contact patient's emergency contacts on scene"],
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return fallback;

    const genAI = new GoogleGenerativeAI(apiKey);
    const briefPrompt = `You are a clinical decision support AI for MediFind emergency responders.
A responder has just accepted an emergency and needs an immediate clinical briefing.
Generate a structured medical brief as valid JSON only (no markdown, no code blocks):

{"brief":"2-3 sentence clinical summary","criticalFlags":["flag1","flag2"],"recommendedActions":["action1","action2"]}

Patient: ${patientName}
Emergency Type: ${emergencyType}
Blood Type: ${bloodType}
Allergies: ${allergies.length > 0 ? allergies.join(', ') : 'None known'}
Chronic Conditions: ${chronicDiseases.length > 0 ? chronicDiseases.join(', ') : 'None known'}
Medications: ${medications.length > 0 ? medications.join(', ') : 'None'}
Patient Type: ${patientType}
Additional Info: ${additionalInfo || 'None'}

Keep criticalFlags to 1-4 items, recommendedActions to 2-4 actionable steps. JSON only — no extra text.`;

    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(briefPrompt);
        const text = result.response.text().trim()
          .replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(text);
        if (parsed.brief) {
          logger.info(`[AI MedicalBrief] Generated via ${modelName}`);
          return parsed;
        }
      } catch { continue; }
    }
    return fallback;
  } catch (err: any) {
    logger.error(`[AI MedicalBrief] Error: ${err.message}`);
    return fallback;
  }
};
