/**
 * 调用 Microsoft Edge 在线 TTS（与 Python edge-tts 一致：需 Sec-MS-GEC、Cookie muid 等）
 * 用于修复 npm 包 `edge-tts` 因缺少 Sec-MS-GEC 导致的 403。
 */
import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { WebSocket } from "ws";

const TRUSTED_CLIENT_TOKEN =
  process.env.EDGE_TTS_TRUSTED_TOKEN?.trim() || "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const CHROMIUM_FULL_VERSION =
  process.env.EDGE_TTS_CHROMIUM_VERSION?.trim() || "143.0.3650.75";
const CHROMIUM_MAJOR = CHROMIUM_FULL_VERSION.split(".", 1)[0] || "143";
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;
const WIN_EPOCH = 11644473600;

let clockSkewSeconds = 0;

function connectId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function dateToString(): string {
  const d = new Date();
  const w = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()]!;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${w} ${months[d.getUTCMonth()]} ${pad(d.getUTCDate())} ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} GMT+0000 (Coordinated Universal Time)`;
}

function generateSecMsGec(): string {
  let ticks = Date.now() / 1000 + clockSkewSeconds;
  ticks += WIN_EPOCH;
  ticks -= ticks % 300;
  ticks *= 1e7;
  const strToHash = `${ticks.toFixed(0)}${TRUSTED_CLIENT_TOKEN}`;
  return crypto.createHash("sha256").update(strToHash, "ascii").digest("hex").toUpperCase();
}

function xmlEscape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function removeIncompatibleCharacters(text: string): string {
  return [...text]
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      if ((code >= 0 && code <= 8) || (code >= 11 && code <= 12) || (code >= 14 && code <= 31)) return " ";
      return ch;
    })
    .join("");
}

function findLastNewlineOrSpaceWithinLimit(text: Uint8Array, limit: number): number {
  let splitAt = -1;
  for (let i = limit - 1; i >= 0; i--) {
    if (text[i] === 0x0a || text[i] === 0x20) {
      splitAt = i;
      break;
    }
  }
  return splitAt;
}

function findSafeUtf8SplitPoint(text: Uint8Array): number {
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
}

function adjustSplitPointForXmlEntity(text: Uint8Array, splitAt: number): number {
  let at = splitAt;
  while (at > 0) {
    const amp = indexOfAmpersand(text, at);
    if (amp < 0) break;
    const semi = indexOfSemicolonBetween(text, amp, at);
    if (semi >= 0) break;
    at = amp;
  }
  return at;
}

function indexOfAmpersand(text: Uint8Array, before: number): number {
  for (let i = before - 1; i >= 0; i--) if (text[i] === 0x26) return i;
  return -1;
}

function indexOfSemicolonBetween(text: Uint8Array, start: number, end: number): number {
  for (let i = start; i < end; i++) if (text[i] === 0x3b) return i;
  return -1;
}

function* splitTextByByteLength(text: string, byteLength: number): Generator<Uint8Array> {
  const enc = new TextEncoder();
  let buf = enc.encode(text);
  while (buf.length > byteLength) {
    let splitAt = findLastNewlineOrSpaceWithinLimit(buf, byteLength);
    if (splitAt < 0) splitAt = findSafeUtf8SplitPoint(buf.subarray(0, byteLength));
    splitAt = adjustSplitPointForXmlEntity(buf, splitAt);
    if (splitAt <= 0) throw new Error("Text chunk boundary could not be found (text too dense).");
    const chunk = buf.subarray(0, splitAt).slice();
    buf = buf.subarray(splitAt === 0 ? 1 : splitAt);
    const trimmed = trimUtf8(chunk);
    if (trimmed.length > 0) yield trimmed;
  }
  const trimmed = trimUtf8(buf);
  if (trimmed.length > 0) yield trimmed;
}

function trimUtf8(bytes: Uint8Array): Uint8Array {
  let start = 0;
  let end = bytes.length;
  while (start < end && (bytes[start] === 0x20 || bytes[start] === 0x0a || bytes[start] === 0x0d))
    start++;
  while (end > start && (bytes[end - 1] === 0x20 || bytes[end - 1] === 0x0a || bytes[end - 1] === 0x0d))
    end--;
  return bytes.subarray(start, end);
}

function buildWsUrl(connectionId: string): string {
  const sec = generateSecMsGec();
  const base = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;
  return `${base}&ConnectionId=${connectionId}&Sec-MS-GEC=${sec}&Sec-MS-GEC-Version=${encodeURIComponent(SEC_MS_GEC_VERSION)}`;
}

function buildWsHeaders(): Record<string, string> {
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
}

function buildSpeechConfig(): string {
  const o = {
    context: {
      synthesis: {
        audio: {
          metadataoptions: { sentenceBoundaryEnabled: "true", wordBoundaryEnabled: "false" },
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        },
      },
    },
  };
  return JSON.stringify(o);
}

function buildSsml(
  escapedInnerText: string,
  voice: string,
  rate: string,
  pitch: string,
  volume: string,
  lang: string
): string {
  return (
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>` +
    `<voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}' volume='${volume}'>` +
    `${escapedInnerText}</prosody></voice></speak>`
  );
}

type Ws403 = { type: "ws403"; dateHeader?: string };

function synthesizeOneChunk(
  escapedChunkUtf8: string,
  opts: { voice: string; rate: string; pitch: string; volume: string; ssmlLang: string }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const connectionId = connectId();
    const url = buildWsUrl(connectionId);
    const ws = new WebSocket(url, { headers: buildWsHeaders() });
    const audioData: Buffer[] = [];

    const fail = (err: unknown) => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      reject(err);
    };

    ws.on("unexpected-response", (_req, res) => {
      const status = res.statusCode ?? 0;
      const dateHeader =
        typeof res.headers?.date === "string"
          ? res.headers.date
          : Array.isArray(res.headers?.date)
            ? res.headers.date[0]
            : undefined;
      if (status === 403) {
        fail({ type: "ws403", dateHeader } satisfies Ws403);
        return;
      }
      fail(new Error(`WebSocket handshake failed: HTTP ${status}`));
    });

    ws.on("message", (rawData, isBinary) => {
      if (!isBinary) {
        const data2 = rawData.toString("utf8");
        if (data2.includes("turn.end")) {
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

    ws.on("error", (err) => fail(err));

    const speechConfig = buildSpeechConfig();
    const configMessage = `X-Timestamp:${dateToString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${speechConfig}`;

    ws.on("open", () =>
      ws.send(configMessage, { compress: true }, (configError) => {
        if (configError) return fail(configError);
        const reqId = connectId();
        const ssmlMessage =
          `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\n` +
          `X-Timestamp:${dateToString()}Z\r\nPath:ssml\r\n\r\n` +
          buildSsml(escapedChunkUtf8, opts.voice, opts.rate, opts.pitch, opts.volume, opts.ssmlLang);
        ws.send(ssmlMessage, { compress: true }, (ssmlError) => {
          if (ssmlError) fail(ssmlError);
        });
      })
    );
  });
}

function applyClockSkewFrom403(e: Ws403): void {
  const raw = e.dateHeader;
  if (!raw) return;
  const serverSec = Date.parse(raw) / 1000;
  if (!Number.isFinite(serverSec)) return;
  const clientSec = Date.now() / 1000;
  clockSkewSeconds += serverSec - clientSec;
}

function isWs403(e: unknown): e is Ws403 {
  return typeof e === "object" && e !== null && (e as Ws403).type === "ws403";
}

async function synthesizeChunkWithRetry(
  escapedChunk: string,
  opts: { voice: string; rate: string; pitch: string; volume: string; ssmlLang: string }
): Promise<Buffer> {
  try {
    return await synthesizeOneChunk(escapedChunk, opts);
  } catch (e) {
    if (isWs403(e)) {
      applyClockSkewFrom403(e);
      return await synthesizeOneChunk(escapedChunk, opts);
    }
    throw e;
  }
}

/** 合成完整文本（自动分段与拼接 MP3） */
export async function synthesizeMicrosoftEdgeTts(
  text: string,
  options: {
    voice: string;
    rate: string;
    pitch: string;
    volume: string;
    ssmlLang?: string;
  }
): Promise<Buffer> {
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

  if (parts.length === 0) return Buffer.alloc(0);
  return Buffer.concat(parts);
}
