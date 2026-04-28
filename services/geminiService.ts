import { GoogleGenAI, Type } from "@google/genai";
import { Frequency, Priority, Status, Task } from "../types.ts";

let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    if (!key) {
      console.warn("GEMINI_API_KEY is not defined in the environment.");
    }
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
};

// We return a partial task because ID and Streaks are handled by the app logic
interface ParsedTaskData {
  title: string;
  status: Status;
  frequency: Frequency;
  priority: Priority;
  nextDue: string; // We expect YYYY-MM-DD
  reps?: string;
  isHomeWorkout?: boolean;
  company?: string;
  role?: string;
  salary?: string;
  location?: string;
  link?: string;
  isJobSearch?: boolean;
  jobCount?: number;
  isProject?: boolean;
}

const extractJson = (text: string) => {
  if (!text) return null;
  try {
    // Try to find JSON block with or without "json" tag
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = match ? match[1] : text;
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error("Failed to extract JSON from:", text);
    // Fallback: try to find anything between { and }
    try {
        const fallbackMatch = text.match(/\{[\s\S]*\}/);
        if (fallbackMatch) {
            return JSON.parse(fallbackMatch[0]);
        }
    } catch (e2) {
        console.error("Fallback JSON extraction failed:", e2);
    }
    return null;
  }
};

export const parseTaskFromInput = async (input: string): Promise<ParsedTaskData | null> => {
  const today = new Date().toISOString().split('T')[0];
  const ai = getAI();

  try {
    const result = await ai.models.generateContent({
      model: "models/gemini-2.0-flash",
      contents: [{
        parts: [{
          text: `Current Date: ${today}. User input: "${input}". 
          Extract task details. If specific info is missing, infer reasonable defaults based on context. 
          Default Status: To Do. 
          Default Priority: Medium.
          
          Frequency Inference:
          - Infer "Daily" for recurring personal habits (e.g., "bath", "brush teeth", "meditate", "exercise").
          - Infer "Weekly" for chores (e.g., "laundry", "clean room", "grocery shopping").
          - Default to "Once" only if it sounds like a specific one-time event or if unsure.
          - "Every weekday" or "weekdays" -> Frequency: Weekdays.
          - "Every 2 weeks" or "biweekly" -> Frequency: Biweekly.
          
          Next Due should be YYYY-MM-DD format based on "today", "tomorrow", "next friday", etc.
          For fitness tasks:
          - Look for "reps", "sets", "minutes" for the 'reps' field (e.g. "3 sets of 10", "30 mins").
          - Infer 'isHomeWorkout' if the context implies home equipment or bodyweight (e.g. "pushups", "yoga", "home workout").
          For job search tasks:
          - Extract 'company', 'role', 'salary', 'location', 'link' if mentioned.
          - Infer 'isJobSearch' if it mentions applying, interviewing, or a company name.
          For project tasks:
          - Infer 'isProject' if it mentions a project, idea, building something, or a side hustle.`
        }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "The concise name of the task" },
            status: { type: Type.STRING, enum: Object.values(Status) },
            frequency: { type: Type.STRING, enum: Object.values(Frequency) },
            priority: { type: Type.STRING, enum: Object.values(Priority) },
            nextDue: { type: Type.STRING, description: "YYYY-MM-DD date" },
            reps: { type: Type.STRING, description: "Workout duration or sets/reps (e.g. '3x12')" },
            isHomeWorkout: { type: Type.BOOLEAN, description: "True if explicitly a home workout or bodyweight exercise" },
            company: { type: Type.STRING },
            role: { type: Type.STRING },
            salary: { type: Type.STRING },
            location: { type: Type.STRING },
            link: { type: Type.STRING },
            isJobSearch: { type: Type.BOOLEAN },
            jobCount: { type: Type.INTEGER, description: "Number of jobs applied to" },
            isProject: { type: Type.BOOLEAN }
          },
          required: ["title", "status", "frequency", "priority", "nextDue"]
        }
      }
    });

    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (responseText) {
      const parsed = extractJson(responseText);
      if (parsed) return parsed as ParsedTaskData;
      console.error("Failed to parse JSON from Gemini response:", responseText);
    }
    console.error("Empty response from Gemini");
    return null;

  } catch (error) {
    console.error("Error parsing task with Gemini:", error);
    if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
    }
    return null;
  }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string | null> => {
  const ai = getAI();
  try {
    const result = await ai.models.generateContent({
      model: "models/gemini-2.0-flash",
      contents: [{
        parts: [
          { inlineData: { mimeType, data: base64Audio } },
          { text: "Transcribe the following audio to text. Return only the transcription." }
        ]
      }]
    });
    return result.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error("Transcription error:", error);
    return null;
  }
};