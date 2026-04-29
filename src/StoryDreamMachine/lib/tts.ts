/**
 * 统一配音：服务端 `/api/tts`（微软在线等）+ 浏览器兜底。
 * 含：客户端 MP3 URL 缓存、并发去重、preloadTts 预加载，降低重复与固定文案的等待。
 */

let currentAudio: HTMLAudioElement | null = null;
let voicesWarmup: Promise<void> | null = null;
/** 每次发起新朗读递增；用于丢弃仍在 await 网络/缓存的旧请求，避免两次 speak 叠播（微软 MP3 + 浏览器兜底混音） */
let speakGeneration = 0;
const TTS_MODE_KEY = "story_tts_mode";

export type TTSMode = "server" | "browser";

function normalizeMode(value: string | null): TTSMode {
  return value === "browser" ? "browser" : "server";
}

export function getTtsMode(): TTSMode {
  if (typeof window === "undefined") return "server";
  return normalizeMode(window.localStorage.getItem(TTS_MODE_KEY));
}

export function setTtsMode(mode: TTSMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TTS_MODE_KEY, mode);
}

const TTS_TEXT_MAX = 12000;

function clipText(text: string): string {
  const t = text.trim();
  return t.length > TTS_TEXT_MAX ? t.slice(0, TTS_TEXT_MAX) : t;
}

/** 客户端缓存：同一文案第二次起几乎即时播放（ObjectURL，LRU 淘汰） */
const MAX_CLIENT_CACHE = 80;
const audioUrlByKey = new Map<string, string>();
const inflightFetch = new Map<string, Promise<string>>();

function clientCacheKey(safe: string): string {
  return `srv:${safe}`;
}

function touchClientCache(key: string): string | undefined {
  const url = audioUrlByKey.get(key);
  if (!url) return undefined;
  audioUrlByKey.delete(key);
  audioUrlByKey.set(key, url);
  return url;
}

function putClientAudioUrl(key: string, url: string): void {
  const prev = audioUrlByKey.get(key);
  if (prev && prev !== url) URL.revokeObjectURL(prev);
  audioUrlByKey.delete(key);
  audioUrlByKey.set(key, url);
  while (audioUrlByKey.size > MAX_CLIENT_CACHE) {
    const oldest = audioUrlByKey.keys().next().value as string | undefined;
    if (!oldest) break;
    const u = audioUrlByKey.get(oldest)!;
    audioUrlByKey.delete(oldest);
    URL.revokeObjectURL(u);
  }
}

/** 拉取或命中缓存，返回可交给 `new Audio(url)` 的 blob URL（勿手动 revoke，由 LRU 管理） */
async function ensureServerAudioUrl(safe: string): Promise<string> {
  const key = clientCacheKey(safe);
  const hit = touchClientCache(key);
  if (hit) return hit;

  let p = inflightFetch.get(key);
  if (!p) {
    p = (async () => {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: safe }),
      });
      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !ct.includes("audio")) {
        throw new Error(`TTS HTTP ${res.status}`);
      }
      const engine = res.headers.get("X-TTS-Engine");
      const cacheStatus = res.headers.get("X-TTS-Cache");
      if (import.meta.env.DEV && (engine || cacheStatus)) {
        console.debug("[TTS]", cacheStatus || "?", engine || "");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      putClientAudioUrl(key, url);
      return url;
    })().finally(() => {
      inflightFetch.delete(key);
    });
    inflightFetch.set(key, p);
  }
  return p;
}

/** 后台预生成 MP3 放入客户端缓存（适合热点、下一步文案） */
export function preloadTts(text: string): void {
  if (!text?.trim()) return;
  if (getTtsMode() !== "server") return;
  const safe = clipText(text);
  void ensureServerAudioUrl(safe).catch(() => {
    /* 预加载失败不影响主流程 */
  });
}

function warmupVoices(): Promise<void> {
  if (voicesWarmup) return voicesWarmup;
  voicesWarmup = new Promise((resolve) => {
    const done = () => resolve();
    if (typeof window === "undefined" || !window.speechSynthesis) {
      done();
      return;
    }
    if (window.speechSynthesis.getVoices().length > 0) {
      done();
      return;
    }
    window.speechSynthesis.onvoiceschanged = done;
    window.setTimeout(done, 800);
  });
  return voicesWarmup;
}

function isZhVoice(v: SpeechSynthesisVoice): boolean {
  const lang = v.lang.toLowerCase();
  const name = v.name.toLowerCase();
  return (
    /^zh/i.test(lang) ||
    /cmn|chinese|中文|简体|國|国/i.test(lang + name) ||
    /xiao|yun|yao|hao|han|hui|ting|jie|xiaoxiao|yaoyao/i.test(name)
  );
}

function rankVoiceForKidsCN(v: SpeechSynthesisVoice): number {
  if (!isZhVoice(v)) return -1;

  const n = v.name.toLowerCase();
  const lang = v.lang.toLowerCase();
  let score = 0;

  if (/microsoft/i.test(n)) score += 42;
  if (/xiaoxiao|晓晓/i.test(n)) score += 38;
  if (/yaoyao|瑶瑶/i.test(n)) score += 28;
  if (/yunxi|云希/i.test(n)) score += 22;
  if (/xiaoyi|晓伊/i.test(n)) score += 24;

  if (/natural|neural/i.test(n)) score += 18;
  if (/online/i.test(n)) score += 6;

  if (/cn|china|mainland|简体|简体中文/i.test(lang + n)) score += 10;

  if (/premium|enhanced|wavenet/i.test(n)) score += 8;

  return score;
}

function pickZhVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const ranked = voices
    .map((v) => ({ v, s: rankVoiceForKidsCN(v) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s);

  if (ranked.length > 0) return ranked[0].v;

  const zhFallback = voices.filter(isZhVoice);
  zhFallback.sort((a, b) => rankVoiceForKidsCN(b) - rankVoiceForKidsCN(a));
  return zhFallback[0] ?? null;
}

export function cancelSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

async function speakBrowser(text: string, myGen: number): Promise<void> {
  await warmupVoices();
  if (myGen !== speakGeneration) return;
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    const voice = pickZhVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.88;
    utterance.pitch = 1.04;
    utterance.volume = 1;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    if (myGen !== speakGeneration) {
      resolve();
      return;
    }
    window.speechSynthesis.speak(utterance);
  });
}

export async function speak(text: string): Promise<void> {
  if (!text?.trim()) return;
  cancelSpeaking();
  const myGen = ++speakGeneration;

  const safe = clipText(text);
  const mode = getTtsMode();

  if (mode === "browser") {
    await speakBrowser(safe, myGen);
    return;
  }

  try {
    const url = await ensureServerAudioUrl(safe);
    if (myGen !== speakGeneration) return;

    const audio = new Audio(url);
    currentAudio = audio;
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        if (currentAudio === audio) currentAudio = null;
        resolve();
      };
      audio.onerror = () => {
        if (currentAudio === audio) currentAudio = null;
        reject(new Error("audio playback error"));
      };
      audio.play().catch((err) => {
        if (myGen !== speakGeneration) {
          if (currentAudio === audio) currentAudio = null;
          resolve();
          return;
        }
        reject(err);
      });
    });
  } catch (e) {
    if (myGen !== speakGeneration) return;
    console.warn("Server TTS failed, using browser fallback:", e);
    await speakBrowser(safe, myGen);
  }
}
