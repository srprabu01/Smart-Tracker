import { GoogleGenAI, Type } from "@google/genai";
import { Frequency, Priority, Status, Task } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// We return a partial task because ID and Streaks are handled by the app logic
interface ParsedTaskData {
  title: string;
  status: Status;
  frequency: Frequency;
  priority: Priority;
  nextDue: string; // We expect YYYY-MM-DD
  reps?: string;
  isHomeWorkout?: boolean;
}

export const parseTaskFromInput = async (input: string): Promise<ParsedTaskData | null> => {
  const today = new Date().toISOString().split('T')[0];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Current Date: ${today}. User input: "${input}". 
      Extract task details. If specific info is missing, infer reasonable defaults based on context. 
      Default Status: To Do. 
      Default Frequency: Once (unless implied otherwise like "every day"). 
      Default Priority: Medium.
      "Every weekday" or "weekdays" -> Frequency: Weekdays.
      "Every 2 weeks" or "biweekly" -> Frequency: Biweekly.
      Next Due should be YYYY-MM-DD format based on "today", "tomorrow", "next friday", etc.
      For fitness tasks:
      - Look for "reps", "sets", "minutes" for the 'reps' field (e.g. "3 sets of 10", "30 mins").
      - Infer 'isHomeWorkout' if the context implies home equipment or bodyweight (e.g. "pushups", "yoga", "home workout").`,
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
            isHomeWorkout: { type: Type.BOOLEAN, description: "True if explicitly a home workout or bodyweight exercise" }
          },
          required: ["title", "status", "frequency", "priority", "nextDue"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as ParsedTaskData;
    }
    return null;

  } catch (error) {
    console.error("Error parsing task with Gemini:", error);
    return null;
  }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Audio } },
          { text: "Transcribe the following audio to text. Return only the transcription." }
        ]
      }
    });
    return response.text || null;
  } catch (error) {
    console.error("Transcription error:", error);
    return null;
  }
};