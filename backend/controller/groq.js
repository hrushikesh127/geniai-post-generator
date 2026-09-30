import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Groq from "groq-sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.join(__dirname, "../.env") });

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});


export const askGroq = async (req, res) => {
  try {
    const { prompt } = req.body;

    // Validate request body
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        message: "Prompt is required"
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        message: "Groq API key is not configured on the server. Please check backend/.env"
      });
    }

    

    // Call the Google Gemini API using @google/genai SDK
    const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [
        {
            role: "user",
            content: prompt
        }
    ]
});

    const generatedText = response?.choices[0].message.content || "";

    return res.status(200).json({
      response: generatedText
    });
  } catch (error) {
    // Log detailed errors only in backend terminal (without exposing any secrets)
    console.error("groq API Error:", error?.message || error);

    // Check for temporary model availability or overload (503)
    const errorStatus = error?.status || error?.code || error?.error?.code;
    const errorMessage = error?.message || "";

    if (errorStatus === 503 || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
      return res.status(503).json({
        message: "groq AI model is temporarily unavailable. Please try again in a few moments."
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