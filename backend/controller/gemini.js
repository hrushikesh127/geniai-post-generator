import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.join(__dirname, "../.env") });

// Centralized model configuration - valid official Gemini models: gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Lazy-initialize GoogleGenAI so that environment variables are guaranteed to be loaded
let aiClient = null;
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not set in backend/.env!");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || ""
    });
  }
  return aiClient;
}

/**
 * Controller to handle Gemini social media content generation
 * Route: POST /api/gemini
 */
export const askGemini = async (req, res) => {
  try {
    const { prompt } = req.body;

    // Validate request body
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        message: "Prompt is required"
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        message: "Gemini API key is not configured on the server. Please check backend/.env"
      });
    }

    const ai = getAiClient();

    // Call the Google Gemini API using @google/genai SDK
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });

    const generatedText = response?.text || "";

    return res.status(200).json({
      response: generatedText
    });
  } catch (error) {
    // Log detailed errors only in backend terminal (without exposing any secrets)
    console.error("Gemini API Error:", error?.message || error);

    // Check for temporary model availability or overload (503)
    const errorStatus = error?.status || error?.code || error?.error?.code;
    const errorMessage = error?.message || "";

    if (errorStatus === 503 || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
      return res.status(503).json({
        message: "Gemini AI model is temporarily unavailable. Please try again in a few moments."
      });
    }

    if (errorStatus === 404 || errorMessage.includes("404") || errorMessage.toLowerCase().includes("not found")) {
      return res.status(500).json({
        message: "Configured AI model was not found. Please check model configuration."
      });
    }

    if (errorStatus === 400 || errorMessage.toLowerCase().includes("api key") || errorMessage.toLowerCase().includes("unauthenticated")) {
      return res.status(400).json({
        message: "Invalid or unauthorized API key. Please check your backend/.env configuration."
      });
    }

    // Generic server / Gemini error - return actual message for easier debugging
    return res.status(500).json({
      message: errorMessage || "Failed to generate content. Please verify your GEMINI_API_KEY."
    });
  }
};