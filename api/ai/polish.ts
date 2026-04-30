import type { IncomingMessage, ServerResponse } from "node:http";
import {
  DEEPSEEK_FALLBACK_TEXT_MODEL,
  buildPolishUserPrompt,
  formatPolishFailure,
  getDeepseekTextModel,
  normalizePolishBody,
  polishSystemPrompt,
  safeParsePolishJson,
} from "./polishShared.ts";

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

const getGlmTextModel = () =>
  (process.env.GLM_TEXT_MODEL || "glm-4.7").trim() || "glm-4.7";

export default async function handler(req: RequestWithBody, res: ServerResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(req);
  const transcript = typeof body.transcript === "string" ? body.transcript : "";
  const context = body.context && typeof body.context === "object" ? body.context : undefined;
  if (!transcript) {
    sendJson(res, 400, { error: "Missing transcript" });
    return;
  }

  const provider = getAIProviderOrNull();
  if (!provider) {
    sendJson(res, 503, {
      error: "NO_AI_PROVIDER",
      message: "未检测到可用的 LLM Key。请配置 DEEPSEEK_API_KEY、GLM_API_KEY、GEMINI_API_KEY 或 OPENAI_API_KEY 之一。",
    });
    return;
  }

  try {
    if (provider === "gemini") {
      const { GoogleGenAI } = await import("@google/genai");
      const model = (process.env.GEMINI_TEXT_MODEL || "gemini-2.0-flash").trim() || "gemini-2.0-flash";
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const response = await genAI.models.generateContent({
        model,
        contents: [
          { role: "user", parts: [{ text: `${polishSystemPrompt}\n\n${buildPolishUserPrompt(transcript, context)}` }] },
        ],
        config: { responseMimeType: "application/json" },
      });
      sendJson(res, 200, normalizePolishBody(safeParsePolishJson(response.text ?? ""), transcript, provider, model));
      return;
    }

    const { default: OpenAI } = await import("openai");
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
        completion = await runChat(model, false);
      } else if (provider === "deepseek" && model !== DEEPSEEK_FALLBACK_TEXT_MODEL) {
        model = DEEPSEEK_FALLBACK_TEXT_MODEL;
        completion = await runChat(model, true);
      } else {
        throw firstErr;
      }
    }

    const content = completion.choices?.[0]?.message?.content;
    if (content == null || String(content).trim() === "") {
      sendJson(res, 502, {
        error: "EMPTY_UPSTREAM_REPLY",
        message: "语言模型未返回有效文本。",
        detail: completion.choices?.length === 0 ? "choices: []" : "empty content",
      });
      return;
    }

    sendJson(res, 200, normalizePolishBody(safeParsePolishJson(String(content)), transcript, provider, model));
  } catch (error) {
    const { message, detail } = formatPolishFailure(error, provider);
    sendJson(res, 500, { error: "AI Processing Failed", message, detail, provider });
  }
}
