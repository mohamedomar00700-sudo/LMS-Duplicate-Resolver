
import { GoogleGenAI, Type } from "@google/genai";
import { ProcessedDuplicate } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDuplicateWithGemini = async (pair: ProcessedDuplicate): Promise<ProcessedDuplicate> => {
  try {
    const ai = getAI();
    
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        analysis: { type: Type.STRING, description: "A summarized reasoning for the decision." },
        shouldDeleteSecondary: { type: Type.BOOLEAN },
        deletionReason: { type: Type.STRING },
        migrationSteps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              courseName: { type: Type.STRING },
              action: { type: Type.STRING }
            }
          }
        },
        warnings: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["analysis", "shouldDeleteSecondary", "deletionReason", "migrationSteps"]
    };

    const prompt = `
      Analyze duplicate user pair.
      Primary: ${JSON.stringify(pair.primaryAccount === 'Talent' ? pair.accountA : pair.accountB)}
      Secondary: ${JSON.stringify(pair.primaryAccount === 'Talent' ? pair.accountB : pair.accountA)}
      Warnings: ${pair.warnings.join(', ')}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      ...pair,
      deletionReason: result.deletionReason || pair.deletionReason,
      shouldDeleteSecondary: result.shouldDeleteSecondary,
      migrationSteps: (result.migrationSteps || []).map((step: any) => ({
        courseName: step.courseName,
        primaryProgress: 0,
        secondaryProgress: 0,
        action: step.action
      })),
      warnings: [...pair.warnings, ...(result.warnings || [])],
      decisionReason: `${pair.decisionReason} (Verified by AI: ${result.analysis?.substring(0, 50)}...)`,
      aiAnalysis: result.analysis
    };

  } catch (error) {
    console.error("Gemini analysis failed", error);
    return { ...pair, warnings: [...pair.warnings, "AI Analysis Failed"] };
  }
};

export const generateEmailDraft = async (pair: ProcessedDuplicate): Promise<string> => {
    try {
        const ai = getAI();
        const prompt = `
            Write a professional and polite email to an employee named ${pair.name}.
            Context: We found two accounts for them in our LMS:
            1. ${pair.primaryEmail} (We have marked this as Primary)
            2. ${pair.secondaryEmail} (We intend to merge/archive this)
            
            Explain that we are cleaning up the system to ensure their learning progress is unified.
            If there are migration steps (${pair.migrationSteps.length > 0 ? 'yes' : 'no'}), mention that we are handling progress transfer.
            Ask them to confirm if they have any objections within 48 hours.
            
            Format: Subject Line + Body.
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        
        return response.text || "Could not generate draft.";
    } catch (e) {
        return "Error generating draft.";
    }
};