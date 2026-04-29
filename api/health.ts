import type { IncomingMessage, ServerResponse } from "node:http";

const validateApiKey = (provider: string) => {
  const keys: Record<string, string | undefined> = {
    gemini: process.env.GEMINI_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    glm: process.env.GLM_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  };
  return !!keys[provider]?.trim();
};

const getAIProviderOrNull = (): string | null => {
  const explicit = (process.env.AI_PROVIDER || "").trim().toLowerCase();
  if (explicit && explicit !== "auto") {
    return validateApiKey(explicit) ? explicit : null;
  }
  const order = ["deepseek", "glm", "gemini", "openai"] as const;
  return order.find((provider) => validateApiKey(provider)) ?? null;
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

const sendJson = (res: ServerResponse, statusCode: number, body: unknown) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
};

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  const llm = getAIProviderOrNull();
  const tts = resolveTTSBackend();
  sendJson(res, 200, {
    status: "ok",
    provider: llm,
    configured: !!llm,
    llm,
    llmConfigured: !!llm,
    tts,
    ttsCloud: tts !== "browser",
  });
}
