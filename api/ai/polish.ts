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

const safeParsePolishJson = (raw: string): Record<string, unknown> => {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
};

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
    ? (parsed.highlights as unknown[]).filter((item): item is string => typeof item === "string")
    : [],
  ai: { provider, model },
});

const formatPolishFailure = (err: unknown, provider: string) => {
  const parts = [`provider=${provider}`];
  if (err instanceof Error) {
    parts.push(`${err.name}: ${err.message || "(no message)"}`);
    const anyErr = err as Error & { status?: number; code?: unknown; error?: unknown; cause?: unknown };
    if (typeof anyErr.status === "number") parts.push(`HTTP ${anyErr.status}`);
    if (anyErr.code != null && anyErr.code !== "") parts.push(`code=${String(anyErr.code)}`);
    if (anyErr.error != null) parts.push(`upstream=${JSON.stringify(anyErr.error).slice(0, 1500)}`);
    if (anyErr.cause != null) parts.push(`cause=${String(anyErr.cause)}`);
  } else {
    parts.push(String(err));
  }
  const detail = parts.filter(Boolean).join(" | ");
  return { message: detail.slice(0, 400), detail };
};

const systemPrompt = `你现在是一名资深的小学一年级语文老师。请阅读以下7岁儿童的看图说话文本。
请保留他原有的逻辑，用一年级下学期学生能听懂、能学习的词汇（如增加适当的形容词、动词），将这段话润色成一段优美的短文。
字数控制在100字以内。
请按以下JSON格式返回：
{
  "feedback": "先夸奖他哪里说得好（如流利度、要素完整度等），语气要亲切鼓励。",
  "polishedStory": "润色后的优美版本",
  "highlights": ["用到的好词1", "用到的好词2"]
}`;

export default async function handler(req: RequestWithBody, res: ServerResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(req);
  const transcript = typeof body.transcript === "string" ? body.transcript : "";
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
          { role: "user", parts: [{ text: `${systemPrompt}\n孩子的原话：${transcript}` }] },
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
      if (provider !== "glm") throw firstErr;
      completion = await runChat(false);
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
