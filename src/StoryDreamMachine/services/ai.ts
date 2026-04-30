import type { StoryData } from '../types';

export type PolishVersionKey = "natural" | "excellent";

export type PolishVersion = {
  title: string;
  story: string;
  coachTip: string;
};

export type PolishWordMagic = {
  word: string;
  meaning: string;
  example: string;
};

export type PolishStoryResult = {
  feedback: string;
  polishedStory: string;
  highlights: string[];
  versions: Record<PolishVersionKey, PolishVersion>;
  strengths: string[];
  improvements: string[];
  wordMagic: PolishWordMagic[];
  readingTip: string;
  nextChallenge: string;
  ai?: { provider: string; model: string };
  polishFallback?: boolean;
  polishError?: string;
  polishDetail?: string;
};

export type PolishStoryContext = {
  storyTitle?: string;
  imageDescription?: string;
  keywords?: string[];
  interviewNotes?: Array<{
    question: string;
    answer: string;
    hint?: string;
  }>;
};

const asText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const asTextList = (value: unknown, fallback: string[] = []) => {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => asText(item))
    .filter(Boolean)
    .slice(0, 5);
  return items.length > 0 ? items : fallback;
};

function normalizeWordMagic(value: unknown, highlights: string[]): PolishWordMagic[] {
  if (!Array.isArray(value)) {
    return highlights.slice(0, 4).map((word) => ({
      word,
      meaning: "让故事更生动",
      example: `可以试着用“${word}”来描述画面。`,
    }));
  }

  const items = value
    .map((item) => {
      if (typeof item === "string") {
        const word = item.trim();
        return word
          ? {
              word,
              meaning: "让故事更生动",
              example: `可以试着用“${word}”来描述画面。`,
            }
          : null;
      }

      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const word = asText(record.word || record.goodWord || record.text);
      if (!word) return null;
      return {
        word,
        meaning: asText(record.meaning || record.reason) || "让故事更生动",
        example: asText(record.example) || `可以试着用“${word}”来描述画面。`,
      };
    })
    .filter((item): item is PolishWordMagic => item !== null)
    .slice(0, 4);

  return items.length > 0 ? items : normalizeWordMagic(undefined, highlights);
}

function normalizeVersion(
  value: unknown,
  title: string,
  fallbackStory: string,
  fallbackTip: string
): PolishVersion {
  if (typeof value === "string") {
    return {
      title,
      story: value.trim() || fallbackStory,
      coachTip: fallbackTip,
    };
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return {
      title: asText(record.title) || title,
      story: asText(record.story || record.text || record.content) || fallbackStory,
      coachTip: asText(record.coachTip || record.tip || record.note) || fallbackTip,
    };
  }

  return {
    title,
    story: fallbackStory,
    coachTip: fallbackTip,
  };
}

function normalizePolishResponse(body: Record<string, unknown>, childTranscript: string): PolishStoryResult {
  const fallbackStory = childTranscript.trim() || "我讲了一个有趣的故事。";
  const feedback = asText(body.feedback) || "你能把看到的画面说出来，已经很棒啦！";
  const rawHighlights = asTextList(body.highlights);
  const versionsRecord =
    body.versions && typeof body.versions === "object"
      ? (body.versions as Record<string, unknown>)
      : {};
  const oldPolishedStory = asText(body.polishedStory);

  const natural = normalizeVersion(
    versionsRecord.natural,
    "保留童真版",
    fallbackStory,
    "这一版保留了你的原意，只帮你把句子接得更顺。"
  );
  const excellent = normalizeVersion(
    versionsRecord.excellent,
    "优秀范文版",
    oldPolishedStory || natural.story || fallbackStory,
    "这一版学习了按顺序讲清楚，并加上一点画面感。"
  );
  const highlights = rawHighlights.length > 0 ? rawHighlights : normalizeWordMagic(body.wordMagic, []).map((item) => item.word);
  const wordMagic = normalizeWordMagic(body.wordMagic, highlights);
  const ai =
    body.ai && typeof body.ai === "object" && body.ai !== null
      ? (body.ai as { provider?: string; model?: string })
      : undefined;

  return {
    feedback,
    polishedStory: excellent.story,
    highlights,
    versions: { natural, excellent },
    strengths: asTextList(body.strengths, ["能把画面里的事情说出来"]),
    improvements: asTextList(body.improvements, ["下次可以加一句人物的心情"]),
    wordMagic,
    readingTip: asText(body.readingTip) || "朗读时先慢一点，把每一句话说清楚，结尾可以读得更开心。",
    nextChallenge: asText(body.nextChallenge) || "下次讲故事时，试着加一句人物的心情。",
    ...(ai?.provider && ai?.model ? { ai: { provider: ai.provider, model: ai.model } } : {}),
  };
}

function buildFallbackPolishResult(
  childTranscript: string,
  extra: Pick<PolishStoryResult, "polishFallback" | "polishError" | "polishDetail">
): PolishStoryResult {
  return {
    ...normalizePolishResponse({}, childTranscript),
    polishFallback: extra.polishFallback,
    polishError: extra.polishError,
    polishDetail: extra.polishDetail,
  };
}

/** 相同原文只发一次 HTTP，避免 React StrictMode 下 effect 双跑导致智谱等 429 */
const polishInflight = new Map<string, Promise<PolishStoryResult>>();

const SKIPPED_MARKERS = new Set(['（跳过了）', '这题我先跳过']);

function cleanAnswer(value: string | undefined) {
  const trimmed = (value ?? '').trim();
  return SKIPPED_MARKERS.has(trimmed) ? '' : trimmed;
}

export function buildPolishStoryContext(
  story: StoryData,
  previousAnswers: Record<string, string>
): PolishStoryContext {
  const keywords = Array.from(
    new Set([
      ...story.hotspots.map((hotspot) => hotspot.label),
      ...story.hotspots.flatMap((hotspot) => hotspot.words),
    ])
  );
  const imageDescription = [
    story.imagePrompt,
    ...story.hotspots.map((hotspot) => {
      const words = hotspot.words.length > 0 ? `参考词：${hotspot.words.join('、')}` : '';
      return `${hotspot.label}：${hotspot.audioText}${words ? ` ${words}` : ''}`;
    }),
  ].join('\n');
  const interviewNotes = story.questions
    .map((question) => ({
      question: question.question,
      answer: cleanAnswer(previousAnswers[question.key]),
      hint: question.hint,
    }))
    .filter((note) => note.answer.length > 0);

  return {
    storyTitle: story.title,
    imageDescription,
    keywords,
    interviewNotes,
  };
}

export async function polishStory(
  childTranscript: string,
  context?: PolishStoryContext
): Promise<PolishStoryResult> {
  const cacheKey = JSON.stringify({ childTranscript, context: context ?? null });
  const existing = polishInflight.get(cacheKey);
  if (existing) return existing;

  const promise = polishStoryOnce(childTranscript, context).finally(() => {
    queueMicrotask(() => {
      if (polishInflight.get(cacheKey) === promise) {
        polishInflight.delete(cacheKey);
      }
    });
  });
  polishInflight.set(cacheKey, promise);
  return promise;
}

async function polishStoryOnce(
  childTranscript: string,
  context?: PolishStoryContext
): Promise<PolishStoryResult> {
  try {
    const response = await fetch("/api/ai/polish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: childTranscript, context }),
    });

    let body: Record<string, unknown> = {};
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      /* ignore */
    }

    if (!response.ok) {
      console.error("AI Polish HTTP error:", response.status, body);
      return buildFallbackPolishResult(childTranscript, {
        polishFallback: true,
        polishError:
          typeof body.error === "string"
            ? body.error
            : response.status === 503
              ? "NO_AI_PROVIDER"
              : "REQUEST_FAILED",
        polishDetail: (() => {
          const msg = typeof body.message === "string" ? body.message.trim() : "";
          const det = typeof body.detail === "string" ? body.detail.trim() : "";
          if (msg && det && msg !== det) return `${msg} — ${det}`;
          return msg || det || undefined;
        })(),
      });
    }

    return normalizePolishResponse(body, childTranscript);
  } catch (error) {
    console.error("AI Polish Error:", error);
    return buildFallbackPolishResult(childTranscript, {
      polishFallback: true,
      polishError: "NETWORK_OR_PARSE",
    });
  }
}

export async function generateStoryImage(prompt: string): Promise<string | null> {
  try {
    const response = await fetch("/api/ai/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) throw new Error("Image API Failed");
    const data = await response.json();
    return data.url || data.image || null;
  } catch (error) {
    console.error("AI Image Generation Error:", error);
    return null;
  }
}
