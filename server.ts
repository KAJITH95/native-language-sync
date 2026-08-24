import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client with required User-Agent
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// In-memory cache to prevent burning API quota on identical requests with versioning
const CACHE_VERSION = "v6";
const translationCache = new Map<string, any>();

function formatReadableEnglish(text: string, tone: string): string {
  if (!text) return "";
  let formatted = text.trim();

  // If there is a greeting at the beginning like "Hi Vanessa," or "Dear Team,", ensure it has a blank line after it
  formatted = formatted.replace(
    /^((?:Hi|Hello|Dear|Hey|Good morning|Good afternoon|Good evening)\s+[^,\n]+,)\s*(?:\n\s*)*([^\n])/i,
    "$1\n\n$2"
  );

  // If the text does not already have multiple paragraphs but is a longer message with distinct transitions
  if (!formatted.includes("\n\n") && formatted.length > 100) {
    // Break before transition sentences like "Now that...", "In addition...", "Please let me know...", "While you may..."
    formatted = formatted.replace(
      /([.!?])\s+(Now that|While you|As per|In the meantime|Please feel free|Please let me know|Looking forward|Regarding|Thank you again)/g,
      "$1\n\n$2"
    );
  }

  // Remove excessive consecutive newlines (more than 2)
  formatted = formatted.replace(/\n{3,}/g, "\n\n");

  return formatted.trim();
}

function formatReadableTarget(text: string): string {
  if (!text) return "";
  let formatted = text.trim();
  // Ensure greetings in target language have clean spacing
  formatted = formatted.replace(/^([^,\n]+,)\s*(?:\n\s*)*([^\n])/i, "$1\n\n$2");
  formatted = formatted.replace(/\n{3,}/g, "\n\n");
  return formatted.trim();
}

// Multi-model fallback sequence for maximum reliability and quota resilience
const FALLBACK_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.7-flash",
  "gemini-3.1-pro-preview",
];

async function generateWithFallback(params: {
  contents: string;
  systemInstruction: string;
  responseSchema: any;
}) {
  const ai = getGenAI();
  let lastError: any = null;

  for (const modelName of FALLBACK_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: "application/json",
          responseSchema: params.responseSchema,
        },
      });

      if (response && response.text) {
        return JSON.parse(response.text);
      }
    } catch (err: any) {
      console.warn(`Model ${modelName} attempt failed:`, err?.message || err);
      lastError = err;
      // Continue to next fallback model
    }
  }

  throw lastError || new Error("All translation models are currently busy. Please try again shortly.");
}

function parseQuotaError(error: any): { isQuota: boolean; retryDelay: number; message: string } {
  const errMsg = typeof error?.message === 'string' ? error.message : JSON.stringify(error || '');
  const isQuota = error?.status === "RESOURCE_EXHAUSTED" || errMsg.includes("429") || errMsg.includes("Quota exceeded");
  
  let retryDelay = 20;
  const match = errMsg.match(/retry in ([0-9.]+)s/i) || errMsg.match(/retryDelay":"([0-9]+)s/i);
  if (match && match[1]) {
    retryDelay = Math.ceil(parseFloat(match[1]));
  }

  return {
    isQuota,
    retryDelay,
    message: isQuota
      ? `API rate limit temporarily reached. Please retry in ${retryDelay} seconds.`
      : error?.message || "Translation error occurred.",
  };
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint 1: Translate Box 1 (Native / Any Language / Tanglish) -> Box 2 (Flawless Polished English)
app.post("/api/translate-box1", async (req, res) => {
  try {
    const { text, tone = "standard" } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Input text is required." });
    }

    const cacheKey = `${CACHE_VERSION}:box1:${tone}:${text.trim().toLowerCase()}`;
    if (translationCache.has(cacheKey)) {
      return res.json(translationCache.get(cacheKey));
    }

    const systemInstruction = `You are a high-precision language translation and English refinement engine.

TASK RULES FOR TONE "${tone}":
- If tone is 'standard': Produce direct, natural, everyday English. If there is a greeting (like 'Hi Vanessa,'), keep it on its own line followed by an empty line. Break multi-sentence updates into 2-3 clean, readable paragraphs with blank lines (\n\n). DO NOT add 'Subject:' or email sign-offs.
- If tone is 'formal': Produce polished, business-ready, high-register phrasing with clean blank lines (\n\n) between greetings, core updates, and closing remarks.
- If tone is 'casual': Produce friendly, conversational, relaxed phrasing with natural line breaks.
- ONLY IF tone is 'email': You MUST format the output as a full workplace email template with:
  1. "Subject: <Relevant concise subject line>"
  2. Greeting (e.g., "Dear [Name]," or "Hi [Name],")
  3. Structured body paragraphs separated by double newlines (\n\n)
  4. Polite sign-off (e.g., "Best regards,")

PARAGRAPH & READABILITY RULE (CRITICAL):
- Never lump a multi-sentence message into a single continuous wall of text!
- Always place a blank line after a greeting (e.g., "Hi Vanessa,\n\n...").
- Separate distinct actions or transitions into clear paragraphs with blank lines (\n\n).

ADDITIONAL RULES:
1. Fix all grammar errors, slangs, and spelling mistakes.
2. Both 'englishOutput' and 'alternativePhasings' MUST BE 100% EXCLUSIVELY IN ENGLISH.
3. Provide 2 concise alternative styles/phrasings strictly in English.`;

    const parsed = await generateWithFallback({
      contents: `Input Text: """${text.trim()}"""\nRequested Tone: ${tone}\nProvide englishOutput and alternativePhasings strictly in English language with clean paragraph breaks:`,
      systemInstruction,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          detectedLanguage: {
            type: Type.STRING,
            description: "The detected input language, e.g. 'Tamil (Tanglish/Latin script)', 'Tamil (தமிழ்)', 'Hindi', 'Spanish', etc.",
          },
          englishOutput: {
            type: Type.STRING,
            description: "The primary flawless English translation with clean paragraph breaks (strictly English).",
          },
          alternativePhasings: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "1-2 alternative ways to say this strictly in polished ENGLISH only. Never output non-English here.",
          },
          grammarNotes: {
            type: Type.STRING,
            description: "A very brief 1-sentence note in English about phrasing or improvements made.",
          },
        },
        required: ["detectedLanguage", "englishOutput"],
      },
    });

    const formattedEnglish = formatReadableEnglish(parsed.englishOutput || "", tone);

    const result = {
      success: true,
      detectedLanguage: parsed.detectedLanguage || "Auto-detected",
      englishOutput: formattedEnglish,
      alternativePhasings: parsed.alternativePhasings || [],
      grammarNotes: parsed.grammarNotes || "",
    };

    translationCache.set(cacheKey, result);
    return res.json(result);
  } catch (error: any) {
    console.error("Error in /api/translate-box1:", error);
    const parsedErr = parseQuotaError(error);
    return res.status(parsedErr.isQuota ? 429 : 500).json({
      error: parsedErr.message,
      isQuota: parsedErr.isQuota,
      retryDelay: parsedErr.retryDelay,
    });
  }
});

// Endpoint 2: Translate Box 2 (Polished English) -> Box 3 (Target Country's Native Language)
app.post("/api/translate-box3", async (req, res) => {
  try {
    const { englishText, countryName, languageName, languageCode } = req.body;
    if (!englishText || typeof englishText !== "string" || !englishText.trim()) {
      return res.status(400).json({ error: "English text from Box 2 is required." });
    }
    if (!countryName || !languageName) {
      return res.status(400).json({ error: "Country and Language must be specified." });
    }

    const cacheKey = `${CACHE_VERSION}:box3:${countryName}:${languageName}:${languageCode}:${englishText.trim().toLowerCase()}`;
    if (translationCache.has(cacheKey)) {
      return res.json(translationCache.get(cacheKey));
    }

    const systemInstruction = `You are an elite localized translation engine.
CRITICAL MANDATE:
1. Translate the provided English text STRICTLY and EXCLUSIVELY into the requested Target Language: "${languageName}" (code: ${languageCode || "auto"}) as spoken in "${countryName}".
2. Preserve all paragraph breaks and blank lines (\n\n) from the English input into the target language translation.
3. For Tamil (ta), you MUST output exclusively in authentic Tamil script (தமிழ்).
4. For Hindi (hi), you MUST output in Devanagari script (हिन्दी).
5. For Japanese (ja), you MUST output in Japanese (日本語).
6. Never output Japanese or any other language unless that exact language is "${languageName}".
7. Provide Romanized phonetic pronunciation for ${languageName}, and brief cultural/formality note.`;

    const parsed = await generateWithFallback({
      contents: `English Text: """${englishText.trim()}"""\nTarget Country: ${countryName}\nTarget Language: ${languageName} (Code: ${languageCode || "auto"})\n\nTranslate strictly into ${languageName} preserving paragraph structure:`,
      systemInstruction,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          translatedText: {
            type: Type.STRING,
            description: `The authentic translation strictly in ${languageName} using native script with matching paragraph line breaks.`,
          },
          pronunciation: {
            type: Type.STRING,
            description: `Phonetic Romanized transliteration for ${languageName}.`,
          },
          usageNote: {
            type: Type.STRING,
            description: `Brief 1-sentence helpful note about ${languageName} context or formality.`,
          },
        },
        required: ["translatedText"],
      },
    });

    const formattedTarget = formatReadableTarget(parsed.translatedText || "");

    const result = {
      success: true,
      translatedText: formattedTarget,
      pronunciation: parsed.pronunciation || "",
      usageNote: parsed.usageNote || "",
    };

    translationCache.set(cacheKey, result);
    return res.json(result);
  } catch (error: any) {
    console.error("Error in /api/translate-box3:", error);
    const parsedErr = parseQuotaError(error);
    return res.status(parsedErr.isQuota ? 429 : 500).json({
      error: parsedErr.message,
      isQuota: parsedErr.isQuota,
      retryDelay: parsedErr.retryDelay,
    });
  }
});

// Endpoint 3: Full End-to-End translation pipeline (Box 1 -> Box 2 -> Box 3)
app.post("/api/translate-all", async (req, res) => {
  try {
    const { text, tone = "standard", countryName, languageName, languageCode } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Input text is required." });
    }
    if (!countryName || !languageName) {
      return res.status(400).json({ error: "Country and Language must be specified." });
    }

    const cacheKey = `${CACHE_VERSION}:all:${tone}:${countryName}:${languageName}:${languageCode}:${text.trim().toLowerCase()}`;
    if (translationCache.has(cacheKey)) {
      return res.json(translationCache.get(cacheKey));
    }

    const systemInstruction = `You are a universal dual-step translation system.
CRITICAL MANDATE:
1. BOX 2 (English Refinement):
   a. Detect the source language.
   b. Convert input into flawless, grammatically accurate English respecting requested tone "${tone}":
      - 'standard': Direct refined text. If input starts with greeting (e.g. 'Hi Vanessa,'), keep greeting on its own line followed by an empty line (\n\n). Separate distinct updates into 2-3 clean, readable paragraphs with double newlines (\n\n). NEVER add "Subject:", "Dear...", or "Best regards".
      - 'formal': Direct polished formal phrasing with clean double newline (\n\n) between greetings, core updates, and closing remarks.
      - 'casual': Direct conversational phrasing with natural paragraph breaks.
      - 'email': ONLY in this mode, format as a complete professional email template with "Subject: ...", Greeting, structured Body separated by \n\n, and Sign-off.
   c. READABILITY MANDATE: Never produce a single dense clump of text when multiple thoughts/actions are expressed. Use \n\n to create distinct paragraphs.
   d. STRICT RULE: Both 'englishOutput' and 'alternativePhasings' MUST BE 100% EXCLUSIVELY IN ENGLISH. Never put Tamil, Hindi, or any other language in alternativePhasings.
   e. Provide 2 concise alternative styles/phrasings strictly in English.
2. BOX 3 (Target Localization):
   a. Translate the polished English STRICTLY and EXCLUSIVELY into the requested target language: "${languageName}" (${languageCode || "auto"}) for "${countryName}".
   b. Preserve all paragraph breaks (\n\n) from the English output into the target translation.
   c. If target is Tamil (ta), you MUST write in authentic Tamil script (தமிழ்) and give Tamil romanized pronunciation.
   d. If target is Hindi (hi), write in Hindi (हिन्दी).
   e. If target is Japanese (ja), write in Japanese (日本語).
   f. Never output Japanese or any other language if "${languageName}" is requested.
3. Provide Romanized phonetic pronunciation for ${languageName}, and brief context note.`;

    const parsed = await generateWithFallback({
      contents: `Input Text: """${text.trim()}"""\nTone: ${tone}\nTarget Country: ${countryName}\nTarget Language: ${languageName} (${languageCode || "auto"})\n\nOutput englishOutput and alternativePhasings STRICTLY in English with clean paragraph line breaks (\n\n), and targetOutput strictly in ${languageName}:`,
      systemInstruction,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          detectedLanguage: { type: Type.STRING },
          englishOutput: {
            type: Type.STRING,
            description: "Strictly 100% polished English output with clean paragraph breaks (double newlines).",
          },
          alternativePhasings: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Strictly 100% polished English alternative phrasings. Never non-English.",
          },
          grammarNotes: { type: Type.STRING },
          targetOutput: {
            type: Type.STRING,
            description: `Strictly translated in ${languageName} with native script and matching paragraph line breaks.`,
          },
          targetPronunciation: {
            type: Type.STRING,
            description: `Phonetic Romanized transliteration for ${languageName}.`,
          },
          usageNote: { type: Type.STRING },
        },
        required: ["detectedLanguage", "englishOutput", "targetOutput"],
      },
    });

    const formattedEnglish = formatReadableEnglish(parsed.englishOutput || "", tone);
    const formattedTarget = formatReadableTarget(parsed.targetOutput || "");

    const result = {
      success: true,
      detectedLanguage: parsed.detectedLanguage || "Auto-detected",
      englishOutput: formattedEnglish,
      alternativePhasings: parsed.alternativePhasings || [],
      grammarNotes: parsed.grammarNotes || "",
      targetOutput: formattedTarget,
      targetPronunciation: parsed.targetPronunciation || "",
      usageNote: parsed.usageNote || "",
    };

    translationCache.set(cacheKey, result);
    return res.json(result);
  } catch (error: any) {
    console.error("Error in /api/translate-all:", error);
    const parsedErr = parseQuotaError(error);
    return res.status(parsedErr.isQuota ? 429 : 500).json({
      error: parsedErr.message,
      isQuota: parsedErr.isQuota,
      retryDelay: parsedErr.retryDelay,
    });
  }
});

// Vite middleware / static serve
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
