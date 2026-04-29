import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { synthesizeMicrosoftEdgeTts } from "./microsoftEdgeTts";
import { getCachedMp3, makeTtsCacheKey, setCachedMp3 } from "./serverTtsCache";

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

const normalizePolishBody = (
  parsed: Record<string, unknown>,
  transcript: string,
  provider: string,
  model: string
) => ({
  feedback: typeof parsed.feedback === "string" ? parsed.feedback : "你真棒！说得很清楚。",
  polishedStory:
    typeof parsed.polishedStory === "string" ? parsed.polishedStory : transcript,
  highlights: Array.isArray(parsed.highlights)
    ? (parsed.highlights as unknown[]).filter((x): x is string => typeof x === "string")
    : [],
  ai: { provider, model },
});

const safeParsePolishJson = (raw: string): Record<string, unknown> => {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (!m) return {};
    try {
      return JSON.parse(m[0]) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
};

const formatPolishFailure = (err: unknown, provider: string): { message: string; detail: string } => {
  const parts: string[] = [`provider=${provider}`];

  if (typeof err === "string") {
    parts.push(err);
    const t = parts.join(" | ");
    return { message: t, detail: t };
  }

  if (err instanceof Error) {
    parts.push(`${err.name}: ${err.message || "(no message)"}`);
    const anyErr = err as Error & { status?: number; code?: unknown; error?: unknown };
    if (typeof anyErr.status === "number") parts.push(`HTTP ${anyErr.status}`);
    if (anyErr.code != null && anyErr.code !== "") parts.push(`code=${String(anyErr.code)}`);
    if (anyErr.error != null) {
      try {
        parts.push(`upstream: ${JSON.stringify(anyErr.error).slice(0, 1500)}`);
      } catch {
        parts.push(`upstream: ${String(anyErr.error)}`);
      }
    }
    const cause = (err as Error & { cause?: unknown }).cause;
    if (cause != null) {
      parts.push(`cause: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  } else if (err && typeof err === "object") {
    try {
      parts.push(JSON.stringify(err).slice(0, 2000));
    } catch {
      parts.push(Object.prototype.toString.call(err));
    }
  } else {
    parts.push(String(err));
  }

  const detail = parts.filter(Boolean).join(" | ") || "unknown_error";
  const message = detail.length > 400 ? `${detail.slice(0, 400)}…` : detail;
  return { message, detail };
};

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

    const systemPrompt = `你现在是一名资深的小学一年级语文老师。请阅读以下7岁儿童的看图说话文本。
请保留他原有的逻辑，用一年级下学期学生能听懂、能学习的词汇（如增加适当的形容词、动词），将这段话润色成一段优美的短文。
字数控制在100字以内。
请按以下JSON格式返回：
{
  "feedback": "先夸奖他哪里说得好（如流利度、要素完整度等），语气要亲切鼓励。",
  "polishedStory": "润色后的优美版本",
  "highlights": ["用到的好词1", "用到的好词2"]
}`;

    try {
      if (provider === "gemini") {
        const geminiModel =
          (process.env.GEMINI_TEXT_MODEL || "gemini-2.0-flash").trim() || "gemini-2.0-flash";
        const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
        const response = await genAI.models.generateContent({
          model: geminiModel,
          contents: [
            { role: "user", parts: [{ text: systemPrompt + `\n孩子的原话：${transcript}` }] },
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
          model = "deepseek-chat";
        } else if (provider === "glm") {
          baseURL = "https://open.bigmodel.cn/api/paas/v4";
          apiKey = process.env.GLM_API_KEY;
          model = getGlmTextModel();
        }

        const client = new OpenAI({ baseURL, apiKey: apiKey || "" });

        const runChat = (useJsonObject: boolean) =>
          client.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `孩子的原话：${transcript}` },
            ],
            model,
            ...(useJsonObject ? { response_format: { type: "json_object" as const } } : {}),
          });

        let completion;
        try {
          completion = await runChat(true);
        } catch (firstErr) {
          if (provider === "glm") {
            console.warn("GLM json_object mode failed, retry without response_format:", firstErr);
            completion = await runChat(false);
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
