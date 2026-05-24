import { GoogleGenAI } from "@google/genai";

export const checkSpellingAndClarify = async (text: string): Promise<string> => {
  // Guidelines: The API key must be obtained exclusively from the environment variable process.env.API_KEY.
  // Assume this variable is pre-configured, valid, and accessible.
  if (!process.env.API_KEY) {
    console.warn("Servicio de IA no disponible (Falta API Key)");
    return text;
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a helpful assistant for a delivery app in Spanish. 
      The user is typing a delivery order. 
      Your task is to correct any spelling errors and formatting issues in Spanish. 
      Return ONLY the corrected text. Do not add conversational filler.
      
      User text: "${text}"`,
    });
    
    return response.text || text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return text; // Return original if fails
  }
};
