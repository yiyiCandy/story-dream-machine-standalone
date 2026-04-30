import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { synthesizeMicrosoftEdgeTts } from "./microsoftEdgeTts.ts";
import { getCachedMp3, makeTtsCacheKey, setCachedMp3 } from "./serverTtsCache.ts";
import {
  DEEPSEEK_FALLBACK_TEXT_MODEL,
  buildPolishUserPrompt,
  formatPolishFailure,
  getDeepseekTextModel,
  normalizePolishBody,
  polishSystemPrompt,
  safeParsePolishJson,
} from "./api/ai/polishShared.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const resolveTTSBackend = (): "edge" | "glm" | "openai" | "browser" => {
  const p = (process.env.TTS_PROVIDER || "auto").trim().toLowerCase();
  if (p === "browser") return "browser";
  if (p === "edge" || p === "edge-tts") return "edge";
  if (p === "openai") return process.env.OPENAI_API_KEY ? "openai" : "browser";
  if (p === "glm") return process.env.GLM_API_KEY ? "glm" : "browser";
  if (p === "auto" || !p) return "edge";
  if (process.env.GLM_API_KEY) return "glm";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "edge";
};

const validateApiKey = (provider: string) => {
  const keys: Record<string, string | undefined> = {
    gemini: process.env.GEMINI_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    glm: process.env.GLM_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  };
  const v = keys[provider]?.trim();
  return !!v;
};

export const getAIProviderOrNull = (): string | null => {
  const explicit = (process.env.AI_PROVIDER || "").trim().toLowerCase();
  if (explicit && explicit !== "auto") {
    return validateApiKey(explicit) ? explicit : null;
  }
  const order = ["deepseek", "glm", "gemini", "openai"] as const;
  for (const p of order) {
    if (validateApiKey(p)) return p;
  }
  return null;
};

const getGlmTextModel = () =>
  (process.env.GLM_TEXT_MODEL || "glm-4.7").trim() || "glm-4.7";

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "512kb" }));

  app.get("/api/health", (_req, res) => {
    const llm = getAIProviderOrNull();
    const tts = resolveTTSBackend();
    res.json({
      status: "ok",
      provider: llm,
      configured: !!llm,
      llm,
      llmConfigured: !!llm,
      tts,
      ttsCloud: tts !== "browser",
    });
  });

  app.post("/api/tts", async (req, res) => {
    const text = typeof req.body?.text === "string" ? req.body.text : "";
    if (!text.trim()) {
      res.status(400).json({ error: "Missing text" });
      return;
    }

    const backend = resolveTTSBackend();
    if (backend === "browser") {
      res.status(501).json({ error: "Use browser TTS", fallthrough: true });
      return;
    }

    try {
      if (backend === "edge") {
        const voice = (process.env.EDGE_TTS_VOICE || "zh-CN-XiaoxiaoNeural").trim() || "zh-CN-XiaoxiaoNeural";
        const rate = (process.env.EDGE_TTS_RATE || "-5%").trim() || "-5%";
        const pitch = (process.env.EDGE_TTS_PITCH || "+0Hz").trim() || "+0Hz";
        const volume = (process.env.EDGE_TTS_VOLUME || "+0%").trim() || "+0%";
        const trimmed = text.trim();

        const cacheKey = makeTtsCacheKey({
          backend: "edge",
          voice,
          rate,
          pitch,
          volume,
          text: trimmed,
        });
        const cached = getCachedMp3(cacheKey);
        if (cached) {
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Cache-Control", "public, max-age=86400");
          res.setHeader("X-TTS-Engine", "microsoft-edge-online");
          res.setHeader("X-TTS-Cache", "HIT");
          res.send(cached);
          return;
        }

        const audio = await synthesizeMicrosoftEdgeTts(trimmed, {
          voice,
          rate,
          pitch,
          volume,
        });
        setCachedMp3(cacheKey, audio);
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.setHeader("X-TTS-Engine", "microsoft-edge-online");
        res.setHeader("X-TTS-Cache", "MISS");
        res.send(audio);
        return;
      }

      if (backend === "glm") {
        const voice = (process.env.GLM_TTS_VOICE || "female").trim() || "female";
        const speed = parseFloat(process.env.GLM_TTS_SPEED || "1.0") || 1.0;
        const volume = parseFloat(process.env.GLM_TTS_VOLUME || "1.0") || 1.0;

        const glmCacheKey = makeTtsCacheKey({
          backend: "glm",
          voice,
          speed: String(speed),
          volume: String(volume),
          text: text.trim(),
        });
        const glmCached = getCachedMp3(glmCacheKey);
        if (glmCached) {
          res.setHeader("Content-Type", "audio/wav");
          res.setHeader("Cache-Control", "public, max-age=86400");
          res.setHeader("X-TTS-Cache", "HIT");
          res.send(glmCached);
          return;
        }

        const r = await fetch("https://open.bigmodel.cn/api/paas/v4/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.GLM_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "glm-tts",
            input: text,
            voice,
            speed,
            volume,
            response_format: "wav",
          }),
        });

        if (!r.ok) {
          const errText = await r.text();
          console.error("GLM-TTS error:", r.status, errText);
          res.status(502).json({ error: "GLM-TTS failed", detail: errText.slice(0, 500) });
          return;
        }

        const buf = Buffer.from(await r.arrayBuffer());
        setCachedMp3(glmCacheKey, buf);
        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.setHeader("X-TTS-Cache", "MISS");
        res.send(buf);
        return;
      }

      if (backend === "openai") {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const voice = (process.env.OPENAI_TTS_VOICE || "nova").trim() || "nova";
        const model = (process.env.OPENAI_TTS_MODEL || "tts-1").trim() || "tts-1";

        const oaKey = makeTtsCacheKey({
          backend: "openai",
          model,
          voice,
          text: text.trim(),
        });
        const oaCached = getCachedMp3(oaKey);
        if (oaCached) {
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Cache-Control", "public, max-age=86400");
          res.setHeader("X-TTS-Cache", "HIT");
          res.send(oaCached);
          return;
        }

        const mp3 = await client.audio.speech.create({
          model,
          voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
          input: text,
        });
        const buf = Buffer.from(await mp3.arrayBuffer());
        setCachedMp3(oaKey, buf);
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.setHeader("X-TTS-Cache", "MISS");
        res.send(buf);
        return;
      }
    } catch (e: any) {
      console.error("TTS error:", e);
      res.status(500).json({ error: e?.message || "TTS failed" });
    }
  });

  app.post("/api/ai/polish", async (req, res) => {
    const { transcript } = req.body;
    const context = req.body?.context && typeof req.body.context === "object" ? req.body.context : undefined;
    const provider = getAIProviderOrNull();

    if (!provider) {
      res.status(503).json({
        error: "NO_AI_PROVIDER",
        message:
          "未检测到可用的 LLM Key。请在项目根目录 .env 中配置 DEEPSEEK_API_KEY、GLM_API_KEY、GEMINI_API_KEY 或 OPENAI_API_KEY 之一（auto 模式下按优先级选用）。",
      });
      return;
    }

    if (typeof transcript !== "string") {
      res.status(400).json({ error: "Missing transcript" });
      return;
    }

    try {
      if (provider === "gemini") {
        const geminiModel =
          (process.env.GEMINI_TEXT_MODEL || "gemini-2.0-flash").trim() || "gemini-2.0-flash";
        const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
        const response = await genAI.models.generateContent({
          model: geminiModel,
          contents: [
            { role: "user", parts: [{ text: `${polishSystemPrompt}\n\n${buildPolishUserPrompt(transcript, context)}` }] },
          ],
          config: {
            responseMimeType: "application/json",
          },
        });
        const text = response.text ?? "";
        const raw = safeParsePolishJson(text);
        res.json(normalizePolishBody(raw, transcript, provider, geminiModel));
      } else if (provider === "deepseek" || provider === "glm" || provider === "openai") {
        let baseURL = "https://api.openai.com/v1";
        let apiKey = process.env.OPENAI_API_KEY;
        let model = "gpt-3.5-turbo";

        if (provider === "deepseek") {
          baseURL = "https://api.deepseek.com";
          apiKey = process.env.DEEPSEEK_API_KEY;
          model = getDeepseekTextModel();
        } else if (provider === "glm") {
          baseURL = "https://open.bigmodel.cn/api/paas/v4";
          apiKey = process.env.GLM_API_KEY;
          model = getGlmTextModel();
        }

        const client = new OpenAI({ baseURL, apiKey: apiKey || "" });

        const runChat = (targetModel: string, useJsonObject: boolean) =>
          client.chat.completions.create({
            messages: [
              { role: "system", content: polishSystemPrompt },
              { role: "user", content: buildPolishUserPrompt(transcript, context) },
            ],
            model: targetModel,
            ...(useJsonObject ? { response_format: { type: "json_object" as const } } : {}),
          });

        let completion;
        try {
          completion = await runChat(model, true);
        } catch (firstErr) {
          if (provider === "glm") {
            console.warn("GLM json_object mode failed, retry without response_format:", firstErr);
            completion = await runChat(model, false);
          } else if (provider === "deepseek" && model !== DEEPSEEK_FALLBACK_TEXT_MODEL) {
            console.warn("DeepSeek primary model failed, retry with fallback model:", firstErr);
            model = DEEPSEEK_FALLBACK_TEXT_MODEL;
            completion = await runChat(model, true);
          } else {
            throw firstErr;
          }
        }

        const choice0 = completion.choices?.[0];
        const content = choice0?.message?.content;
        if (content == null || String(content).trim() === "") {
          console.error("Polish empty completion:", provider, JSON.stringify(completion));
          res.status(502).json({
            error: "EMPTY_UPSTREAM_REPLY",
            message: "语言模型未返回有效文本（choices 为空或被截断）。请稍后重试或检查 GLM_TEXT_MODEL / 余额。",
            detail: completion.choices?.length === 0 ? "choices: []" : "empty content",
          });
          return;
        }

        const parsed = safeParsePolishJson(String(content));
        res.json(normalizePolishBody(parsed, transcript, provider, model));
      }
    } catch (error: unknown) {
      const { message, detail } = formatPolishFailure(error, provider);
      console.error(`AI Error (${provider}):`, message, detail);
      res.status(500).json({
        error: "AI Processing Failed",
        message,
        detail,
        provider,
      });
    }
  });

  app.post("/api/ai/image", async (req, res) => {
    const { prompt } = req.body;
    const provider = getAIProviderOrNull();

    try {
      if (!provider) {
        res.status(503).json({ error: "NO_AI_PROVIDER", message: "未配置可用的 LLM / 绘图相关 Key" });
        return;
      }
      if (provider === "gemini") {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await client.images.generate({
          model: "dall-e-3",
          prompt: `A beautiful, colorful, friendly illustration for a children's book. Style: Soft, vibrant, clean lines, suitable for 7-year-olds. Scene: ${prompt}`,
          n: 1,
          size: "1024x1024",
        });
        res.json({ url: response.data[0].url });
      } else {
        res.status(501).json({ error: "Image generation not configured for this provider" });
      }
    } catch (error) {
      console.error("Image Error:", error);
      res.status(500).json({ error: "Image Generation Failed" });
    }
  });

  return app;
}
