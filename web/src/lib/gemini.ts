/**
 * Gemini LLM Service
 * 
 * Provides AI-powered due diligence generation using Google Gemini.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// ============ Types ============

export interface DDSection {
    label: string;
    bullets: string[];
}

export interface GeminiDDResult {
    sections: DDSection[];
    source: "gemini" | "fallback";
}

// ============ Initialize Gemini ============

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
}

// ============ DD Generation ============

const DD_PROMPT = `You are a financial analyst assistant. Generate due diligence analysis for a prediction market.

Given this market question: "{question}"
Current implied probability: {probability}% YES

Generate analysis in EXACTLY this JSON format (no markdown, just raw JSON):
{
  "sections": [
    {
      "label": "What changed",
      "bullets": ["bullet 1", "bullet 2", "bullet 3"]
    },
    {
      "label": "Background / context",
      "bullets": ["bullet 1", "bullet 2", "bullet 3"]
    },
    {
      "label": "Key drivers",
      "bullets": ["bullet 1", "bullet 2", "bullet 3"]
    },
    {
      "label": "Counterarguments / risks",
      "bullets": ["bullet 1", "bullet 2"]
    },
    {
      "label": "Known unknowns",
      "bullets": ["bullet 1", "bullet 2"]
    }
  ]
}

Guidelines:
- Each bullet should be 1-2 sentences max
- Be specific and actionable, not generic
- Reference real market factors, policy dynamics, or economic drivers
- For "What changed", focus on recent developments driving market activity
- For "Key drivers", list specific metrics, events, or announcements to watch
- Keep language professional and financial-analyst style
- Do NOT include any markdown formatting, just raw JSON`;

/**
 * Generate DD using Gemini LLM
 */
export async function generateDDWithGemini(
    question: string,
    probability?: number
): Promise<GeminiDDResult> {
    if (!genAI) {
        console.warn("Gemini API key not configured, using fallback");
        return { sections: [], source: "fallback" };
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = DD_PROMPT
            .replace("{question}", question)
            .replace("{probability}", probability ? Math.round(probability * 100).toString() : "50");

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse JSON from response
        // Handle potential markdown code blocks
        let jsonText = text;
        if (text.includes("```json")) {
            jsonText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
        } else if (text.includes("```")) {
            jsonText = text.replace(/```\n?/g, "");
        }

        const parsed = JSON.parse(jsonText.trim());

        if (parsed.sections && Array.isArray(parsed.sections)) {
            return {
                sections: parsed.sections,
                source: "gemini",
            };
        }

        return { sections: [], source: "fallback" };
    } catch (error) {
        console.error("Gemini DD generation failed:", error);
        return { sections: [], source: "fallback" };
    }
}

/**
 * Check if Gemini is configured
 */
export function isGeminiConfigured(): boolean {
    return !!genAI;
}
