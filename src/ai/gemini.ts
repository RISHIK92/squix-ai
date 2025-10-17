import { GoogleGenerativeAI } from "@google/generative-ai";

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const DEFAULT_GEMINI_CLASSIFIER = "gemini-2.0-flash";
export const DEFAULT_GEMINI_SQL = "gemini-2.5-flash";
export const DEFAULT_GEMINI_COACH = "gemini-2.5-flash";
export const DEFAULT_GEMINI_CHAT = "gemini-2.0-flash";

export type GeminiModel = ReturnType<typeof genAI.getGenerativeModel>;
