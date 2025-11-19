import { GoogleGenAI, Type } from "@google/genai";
import { OcrResult } from "../types";

// Using the API Key from environment variable as strictly requested
const apiKey = process.env.API_KEY || ''; 

const ai = new GoogleGenAI({ apiKey });

export const extractChequeDetails = async (base64Image: string): Promise<OcrResult> => {
  if (!apiKey) {
    console.warn("No API KEY found in process.env.API_KEY. Mocking response for demo.");
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      chequeNumber: "100" + Math.floor(Math.random() * 999),
      amount: Math.floor(Math.random() * 5000) + 100,
      payeeName: "Scanned Vendor Inc.",
      date: new Date().toISOString().split('T')[0],
      bankName: "Demo Bank"
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // Assuming JPEG for simplicity, or extract from base64 header if needed
              data: base64Image.split(',')[1] || base64Image // Strip header if present
            }
          },
          {
            text: `Analyze this cheque image. Extract the following details into a JSON object:
            - chequeNumber (string)
            - amount (number)
            - payeeName (string)
            - date (string in YYYY-MM-DD format)
            - bankName (string)
            
            If a field is not visible or legible, return null for that field.`
          }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            chequeNumber: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            payeeName: { type: Type.STRING },
            date: { type: Type.STRING },
            bankName: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const result = JSON.parse(text);
    return result as OcrResult;

  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("Failed to process image.");
  }
};