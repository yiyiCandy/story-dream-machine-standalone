import { Buffer } from "node:buffer";
import crypto from "node:crypto";
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

const DEFAULT_MAX_ENTRIES = Number(process.env.TTS_SERVER_CACHE_MAX || "300") || 300;
const ttsCache = new Map<string, Buffer>();

const makeTtsCacheKey = (parts: Record<string, string>) => {
  const stable = JSON.stringify(parts, Object.keys(parts).sort());
  return crypto.createHash("sha256").update(stable).digest("hex");
};

const getCachedMp3 = (key: string) => {
  const cached = ttsCache.get(key);
  if (!cached) return undefined;
  ttsCache.delete(key);
  ttsCache.set(key, cached);
  return cached;
};

const setCachedMp3 = (key: string, audio: Buffer) => {
  if (ttsCache.has(key)) ttsCache.delete(key);
  ttsCache.set(key, audio);
  while (ttsCache.size > DEFAULT_MAX_ENTRIES) {
    const oldest = ttsCache.keys().next().value as string | undefined;
    if (!oldest) break;
    ttsCache.delete(oldest);
  }
};

const TRUSTED_CLIENT_TOKEN =
  process.env.EDGE_TTS_TRUSTED_TOKEN?.trim() || "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const CHROMIUM_FULL_VERSION =
  process.env.EDGE_TTS_CHROMIUM_VERSION?.trim() || "143.0.3650.75";
const CHROMIUM_MAJOR = CHROMIUM_FULL_VERSION.split(".", 1)[0] || "143";
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;
const WIN_EPOCH = 11644473600;

let clockSkewSeconds = 0;

const connectId = () => crypto.randomUUID().replace(/-/g, "");

const dateToString = () => {
  const d = new Date();
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${weekdays[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${pad(d.getUTCDate())} ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} GMT+0000 (Coordinated Universal Time)`;
};

const generateSecMsGec = () => {
  let ticks = Date.now() / 1000 + clockSkewSeconds;
  ticks += WIN_EPOCH;
  ticks -= ticks % 300;
  ticks *= 1e7;
  const strToHash = `${ticks.toFixed(0)}${TRUSTED_CLIENT_TOKEN}`;
  return crypto.createHash("sha256").update(strToHash, "ascii").digest("hex").toUpperCase();
};

const xmlEscape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const removeIncompatibleCharacters = (text: string) =>
  [...text]
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      if ((code >= 0 && code <= 8) || (code >= 11 && code <= 12) || (code >= 14 && code <= 31)) return " ";
      return ch;
    })
    .join("");

const trimUtf8 = (bytes: Uint8Array) => {
  let start = 0;
  let end = bytes.length;
  while (start < end && (bytes[start] === 0x20 || bytes[start] === 0x0a || bytes[start] === 0x0d)) start++;
  while (end > start && (bytes[end - 1] === 0x20 || bytes[end - 1] === 0x0a || bytes[end - 1] === 0x0d)) end--;
  return bytes.subarray(start, end);
};

const findLastNewlineOrSpaceWithinLimit = (text: Uint8Array, limit: number) => {
  for (let i = limit - 1; i >= 0; i--) {
    if (text[i] === 0x0a || text[i] === 0x20) return i;
  }
  return -1;
};

const findSafeUtf8SplitPoint = (text: Uint8Array) => {
  let splitAt = text.length;
  while (splitAt > 0) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(text.subarray(0, splitAt));
      return splitAt;
    } catch {
      splitAt -= 1;
    }
  }
  return 0;
};

const indexOfAmpersand = (text: Uint8Array, before: number) => {
  for (let i = before - 1; i >= 0; i--) if (text[i] === 0x26) return i;
  return -1;
};

const indexOfSemicolonBetween = (text: Uint8Array, start: number, end: number) => {
  for (let i = start; i < end; i++) if (text[i] === 0x3b) return i;
  return -1;
};

const adjustSplitPointForXmlEntity = (text: Uint8Array, splitAt: number) => {
  let at = splitAt;
  while (at > 0) {
    const amp = indexOfAmpersand(text, at);
    if (amp < 0) break;
    const semi = indexOfSemicolonBetween(text, amp, at);
    if (semi >= 0) break;
    at = amp;
  }
  return at;
};

function* splitTextByByteLength(text: string, byteLength: number): Generator<Uint8Array> {
  const enc = new TextEncoder();
  let buf = enc.encode(text);
  while (buf.length > byteLength) {
    let splitAt = findLastNewlineOrSpaceWithinLimit(buf, byteLength);
    if (splitAt < 0) splitAt = findSafeUtf8SplitPoint(buf.subarray(0, byteLength));
    splitAt = adjustSplitPointForXmlEntity(buf, splitAt);
    if (splitAt <= 0) throw new Error("Text chunk boundary could not be found.");
    const chunk = buf.subarray(0, splitAt).slice();
    buf = buf.subarray(splitAt);
    const trimmed = trimUtf8(chunk);
    if (trimmed.length > 0) yield trimmed;
  }
  const trimmed = trimUtf8(buf);
  if (trimmed.length > 0) yield trimmed;
}

const buildWsUrl = (connectionId: string) => {
  const sec = generateSecMsGec();
  const base = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;
  return `${base}&ConnectionId=${connectionId}&Sec-MS-GEC=${sec}&Sec-MS-GEC-Version=${encodeURIComponent(SEC_MS_GEC_VERSION)}`;
};

const buildWsHeaders = () => {
  const muid = crypto.randomBytes(16).toString("hex").toUpperCase();
  return {
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
    Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
    "Sec-WebSocket-Version": "13",
    "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR}.0.0.0`,
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9",
    Cookie: `muid=${muid};`,
  };
};

const buildSpeechConfig = () =>
  JSON.stringify({
    context: {
      synthesis: {
        audio: {
          metadataoptions: { sentenceBoundaryEnabled: "true", wordBoundaryEnabled: "false" },
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        },
      },
    },
  });

const buildSsml = (text: string, voice: string, rate: string, pitch: string, volume: string, lang: string) =>
  `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>` +
  `<voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}' volume='${volume}'>${text}</prosody></voice></speak>`;

type Ws403 = { type: "ws403"; dateHeader?: string };

const isWs403 = (error: unknown): error is Ws403 =>
  typeof error === "object" && error !== null && (error as Ws403).type === "ws403";

const applyClockSkewFrom403 = (error: Ws403) => {
  if (!error.dateHeader) return;
  const serverSec = Date.parse(error.dateHeader) / 1000;
  if (!Number.isFinite(serverSec)) return;
  const clientSec = Date.now() / 1000;
  clockSkewSeconds += serverSec - clientSec;
};

const synthesizeOneChunk = async (
  escapedChunkUtf8: string,
  opts: { voice: string; rate: string; pitch: string; volume: string; ssmlLang: string }
) => {
  const { WebSocket } = await import("ws");
  return new Promise<Buffer>((resolve, reject) => {
    const connectionId = connectId();
    const ws = new WebSocket(buildWsUrl(connectionId), { headers: buildWsHeaders() });
    const audioData: Buffer[] = [];

    const fail = (err: unknown) => {
      try {
        ws.close();
      } catch {
        /* ignore close errors */
      }
      reject(err);
    };

    ws.on("unexpected-response", (_req, response) => {
      const status = response.statusCode ?? 0;
      const rawDate = response.headers?.date;
      const dateHeader = typeof rawDate === "string" ? rawDate : Array.isArray(rawDate) ? rawDate[0] : undefined;
      if (status === 403) {
        fail({ type: "ws403", dateHeader } satisfies Ws403);
        return;
      }
      fail(new Error(`WebSocket handshake failed: HTTP ${status}`));
    });

    ws.on("message", (rawData, isBinary) => {
      if (!isBinary) {
        const data = rawData.toString("utf8");
        if (data.includes("turn.end")) {
          resolve(Buffer.concat(audioData));
          ws.close();
        }
        return;
      }

      const data = rawData as Buffer;
      const separator = Buffer.from("Path:audio\r\n");
      const idx = data.indexOf(separator);
      if (idx >= 0) {
        audioData.push(data.subarray(idx + separator.length));
      }
    });

    ws.on("error", fail);

    ws.on("open", () => {
      const speechConfig =
        `X-Timestamp:${dateToString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        buildSpeechConfig();
      ws.send(speechConfig, { compress: true }, (configError) => {
        if (configError) return fail(configError);
        const requestId = connectId();
        const ssml =
          `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\n` +
          `X-Timestamp:${dateToString()}Z\r\nPath:ssml\r\n\r\n` +
          buildSsml(escapedChunkUtf8, opts.voice, opts.rate, opts.pitch, opts.volume, opts.ssmlLang);
        ws.send(ssml, { compress: true }, (ssmlError) => {
          if (ssmlError) fail(ssmlError);
        });
      });
    });
  });
};

const synthesizeChunkWithRetry = async (
  escapedChunk: string,
  opts: { voice: string; rate: string; pitch: string; volume: string; ssmlLang: string }
) => {
  try {
    return await synthesizeOneChunk(escapedChunk, opts);
  } catch (error) {
    if (isWs403(error)) {
      applyClockSkewFrom403(error);
      return await synthesizeOneChunk(escapedChunk, opts);
    }
    throw error;
  }
};

const synthesizeMicrosoftEdgeTts = async (
  text: string,
  options: { voice: string; rate: string; pitch: string; volume: string; ssmlLang?: string }
) => {
  const cleaned = removeIncompatibleCharacters(text);
  const escaped = xmlEscape(cleaned);
  const lang =
    options.ssmlLang?.trim() ||
    (options.voice.toLowerCase().startsWith("zh-") ? "zh-CN" : "en-US");
  const parts: Buffer[] = [];

  for (const chunk of splitTextByByteLength(escaped, 4096)) {
    const chunkStr = new TextDecoder("utf-8", { fatal: true }).decode(chunk);
    parts.push(await synthesizeChunkWithRetry(chunkStr, { ...options, ssmlLang: lang }));
  }

  return parts.length === 0 ? Buffer.alloc(0) : Buffer.concat(parts);
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
      const voice = (process.env.EDGE_TTS_VOICE || "zh-CN-XiaoxiaoNeural").trim() || "zh-CN-XiaoxiaoNeural";
      const rate = (process.env.EDGE_TTS_RATE || "-5%").trim() || "-5%";
      const pitch = (process.env.EDGE_TTS_PITCH || "+0Hz").trim() || "+0Hz";
      const volume = (process.env.EDGE_TTS_VOLUME || "+0%").trim() || "+0%";
      const trimmed = text.trim();
      const cacheKey = makeTtsCacheKey({ backend: "edge", voice, rate, pitch, volume, text: trimmed });
      const cached = getCachedMp3(cacheKey);

      if (cached) {
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.setHeader("X-TTS-Engine", "microsoft-edge-online");
        res.setHeader("X-TTS-Cache", "HIT");
        res.end(cached);
        return;
      }

      const audio = await synthesizeMicrosoftEdgeTts(trimmed, { voice, rate, pitch, volume });
      setCachedMp3(cacheKey, audio);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("X-TTS-Engine", "microsoft-edge-online");
      res.setHeader("X-TTS-Cache", "MISS");
      res.end(audio);
      return;
    }

    if (backend === "glm") {
      const voice = (process.env.GLM_TTS_VOICE || "female").trim() || "female";
      const speed = parseFloat(process.env.GLM_TTS_SPEED || "1.0") || 1.0;
      const volume = parseFloat(process.env.GLM_TTS_VOLUME || "1.0") || 1.0;
      const cacheKey = makeTtsCacheKey({
        backend: "glm",
        voice,
        speed: String(speed),
        volume: String(volume),
        text: text.trim(),
      });
      const cached = getCachedMp3(cacheKey);

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
      setCachedMp3(cacheKey, audio);
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("X-TTS-Cache", "MISS");
      res.end(audio);
      return;
    }

    if (backend === "openai") {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const voice = (process.env.OPENAI_TTS_VOICE || "nova").trim() || "nova";
      const model = (process.env.OPENAI_TTS_MODEL || "tts-1").trim() || "tts-1";
      const cacheKey = makeTtsCacheKey({ backend: "openai", model, voice, text: text.trim() });
      const cached = getCachedMp3(cacheKey);

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
      setCachedMp3(cacheKey, audio);
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
