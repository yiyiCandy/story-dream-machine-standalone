import crypto from "node:crypto";
import { Buffer } from "node:buffer";

/** 服务端 MP3 内存缓存（相同文案+音色参数命中后几乎秒回） */

const DEFAULT_MAX_ENTRIES = Number(process.env.TTS_SERVER_CACHE_MAX || "300") || 300;

const cache = new Map<string, Buffer>();

export function makeTtsCacheKey(parts: Record<string, string>): string {
  const stable = JSON.stringify(parts, Object.keys(parts).sort());
  return crypto.createHash("sha256").update(stable).digest("hex");
}

export function getCachedMp3(key: string): Buffer | undefined {
  const buf = cache.get(key);
  if (!buf) return undefined;
  cache.delete(key);
  cache.set(key, buf);
  return buf;
}

export function setCachedMp3(key: string, buf: Buffer): void {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, buf);
  evictIfNeeded();
}

function evictIfNeeded(): void {
  while (cache.size > DEFAULT_MAX_ENTRIES) {
    const oldest = cache.keys().next().value as string | undefined;
    if (!oldest) break;
    cache.delete(oldest);
  }
}
