import express from "express";
import { askGroq } from "../controller/groq.js";

const router = express.Router();

// POST /api/gemini
router.post("/", askGroq);

export default router;
