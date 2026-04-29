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

export default async function handler(req: RequestWithBody, res: ServerResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(req);
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  if (!prompt) {
    sendJson(res, 400, { error: "Missing prompt" });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    sendJson(res, 503, { error: "NO_IMAGE_PROVIDER", message: "未配置 OPENAI_API_KEY" });
    return;
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.images.generate({
      model: "dall-e-3",
      prompt: `A beautiful, colorful, friendly illustration for a children's book. Style: Soft, vibrant, clean lines, suitable for 7-year-olds. Scene: ${prompt}`,
      n: 1,
      size: "1024x1024",
    });
    sendJson(res, 200, { url: response.data?.[0]?.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendJson(res, 500, { error: "Image Generation Failed", message });
  }
}
