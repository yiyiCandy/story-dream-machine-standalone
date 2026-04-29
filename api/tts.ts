import type { IncomingMessage, ServerResponse } from "node:http";

type RequestWithBody = IncomingMessage & { body?: unknown };

const readJsonBody = async (req: RequestWithBody): Promise<Record<string, unknown>> => {
  if (req.body && typeof req.body === "object") {
    return req.body as Record<string, unknown>;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const sendJson = (res: ServerResponse, statusCode: number, body: unknown) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
};

const resolveTTSBackend = (): "edge" | "glm" | "openai" | "browser" => {
  const provider = (process.env.TTS_PROVIDER || "auto").trim().toLowerCase();
  if (provider === "browser") return "browser";
  if (provider === "edge" || provider === "edge-tts") return "edge";
  if (provider === "openai") return process.env.OPENAI_API_KEY ? "openai" : "browser";
  if (provider === "glm") return process.env.GLM_API_KEY ? "glm" : "browser";
  if (provider === "auto" || !provider) return "edge";
  if (process.env.GLM_API_KEY) return "glm";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "edge";
};

export default async function handler(req: RequestWithBody, res: ServerResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(req);
  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) {
    sendJson(res, 400, { error: "Missing text" });
    return;
  }

  const backend = resolveTTSBackend();
  if (backend === "browser") {
    sendJson(res, 501, { error: "Use browser TTS", fallthrough: true });
    return;
  }

  try {
    if (backend === "edge") {
      const [{ synthesizeMicrosoftEdgeTts }, cache] = await Promise.all([
        import("../microsoftEdgeTts.ts"),
        import("../serverTtsCache.ts"),
      ]);
      const voice = (process.env.EDGE_TTS_VOICE || "zh-CN-XiaoxiaoNeural").trim() || "zh-CN-XiaoxiaoNeural";
      const rate = (process.env.EDGE_TTS_RATE || "-5%").trim() || "-5%";
      const pitch = (process.env.EDGE_TTS_PITCH || "+0Hz").trim() || "+0Hz";
      const volume = (process.env.EDGE_TTS_VOLUME || "+0%").trim() || "+0%";
      const trimmed = text.trim();
      const cacheKey = cache.makeTtsCacheKey({ backend: "edge", voice, rate, pitch, volume, text: trimmed });
      const cached = cache.getCachedMp3(cacheKey);

      if (cached) {
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.setHeader("X-TTS-Engine", "microsoft-edge-online");
        res.setHeader("X-TTS-Cache", "HIT");
        res.end(cached);
        return;
      }

      const audio = await synthesizeMicrosoftEdgeTts(trimmed, { voice, rate, pitch, volume });
      cache.setCachedMp3(cacheKey, audio);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("X-TTS-Engine", "microsoft-edge-online");
      res.setHeader("X-TTS-Cache", "MISS");
      res.end(audio);
      return;
    }

    if (backend === "glm") {
      const cache = await import("../serverTtsCache.ts");
      const voice = (process.env.GLM_TTS_VOICE || "female").trim() || "female";
      const speed = parseFloat(process.env.GLM_TTS_SPEED || "1.0") || 1.0;
      const volume = parseFloat(process.env.GLM_TTS_VOLUME || "1.0") || 1.0;
      const cacheKey = cache.makeTtsCacheKey({
        backend: "glm",
        voice,
        speed: String(speed),
        volume: String(volume),
        text: text.trim(),
      });
      const cached = cache.getCachedMp3(cacheKey);

      if (cached) {
        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.setHeader("X-TTS-Cache", "HIT");
        res.end(cached);
        return;
      }

      const upstream = await fetch("https://open.bigmodel.cn/api/paas/v4/audio/speech", {
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

      if (!upstream.ok) {
        const detail = await upstream.text();
        sendJson(res, 502, { error: "GLM-TTS failed", detail: detail.slice(0, 500) });
        return;
      }

      const audio = Buffer.from(await upstream.arrayBuffer());
      cache.setCachedMp3(cacheKey, audio);
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("X-TTS-Cache", "MISS");
      res.end(audio);
      return;
    }

    if (backend === "openai") {
      const [{ default: OpenAI }, cache] = await Promise.all([
        import("openai"),
        import("../serverTtsCache.ts"),
      ]);
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const voice = (process.env.OPENAI_TTS_VOICE || "nova").trim() || "nova";
      const model = (process.env.OPENAI_TTS_MODEL || "tts-1").trim() || "tts-1";
      const cacheKey = cache.makeTtsCacheKey({ backend: "openai", model, voice, text: text.trim() });
      const cached = cache.getCachedMp3(cacheKey);

      if (cached) {
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.setHeader("X-TTS-Cache", "HIT");
        res.end(cached);
        return;
      }

      const mp3 = await client.audio.speech.create({
        model,
        voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
        input: text,
      });
      const audio = Buffer.from(await mp3.arrayBuffer());
      cache.setCachedMp3(cacheKey, audio);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("X-TTS-Cache", "MISS");
      res.end(audio);
      return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendJson(res, 500, { error: message || "TTS failed" });
  }
}
