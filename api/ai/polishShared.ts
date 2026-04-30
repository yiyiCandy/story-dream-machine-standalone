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

export type NormalizedPolishBody = {
  feedback: string;
  polishedStory: string;
  highlights: string[];
  versions: Record<PolishVersionKey, PolishVersion>;
  strengths: string[];
  improvements: string[];
  wordMagic: PolishWordMagic[];
  readingTip: string;
  nextChallenge: string;
  ai: { provider: string; model: string };
};

export type PolishPromptContext = {
  storyTitle?: string;
  imageDescription?: string;
  keywords?: string[];
  interviewNotes?: Array<{
    question: string;
    answer: string;
    hint?: string;
  }>;
};

export const getDeepseekTextModel = () =>
  (process.env.DEEPSEEK_TEXT_MODEL || "deepseek-v4-pro").trim() || "deepseek-v4-pro";

export const DEEPSEEK_FALLBACK_TEXT_MODEL = "deepseek-v4-flash";

const DEFAULT_FEEDBACK = "你能把看到的画面说出来，已经很棒啦！";
const DEFAULT_READING_TIP = "朗读时先慢一点，把每一句话说清楚，结尾可以读得更开心。";
const DEFAULT_NEXT_CHALLENGE = "下次讲故事时，试着加一句人物的心情。";

const asText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const limitText = (value: unknown, maxLength: number) => asText(value).slice(0, maxLength);

const asTextList = (value: unknown, fallback: string[] = []) => {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => asText(item))
    .filter(Boolean)
    .slice(0, 5);
  return items.length > 0 ? items : fallback;
};

const normalizePromptContext = (value: unknown): PolishPromptContext => {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  const keywords = Array.isArray(record.keywords)
    ? record.keywords
        .map((item) => limitText(item, 24))
        .filter(Boolean)
        .slice(0, 24)
    : [];
  const interviewNotes = Array.isArray(record.interviewNotes)
    ? record.interviewNotes
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const note = item as Record<string, unknown>;
          const question = limitText(note.question, 80);
          const answer = limitText(note.answer, 160);
          if (!question || !answer) return null;
          return {
            question,
            answer,
            hint: limitText(note.hint, 80) || undefined,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .slice(0, 8)
    : [];

  return {
    storyTitle: limitText(record.storyTitle, 60) || undefined,
    imageDescription: limitText(record.imageDescription, 800) || undefined,
    keywords,
    interviewNotes,
  };
};

const formatPromptContext = (context: PolishPromptContext) => {
  const parts: string[] = [];
  if (context.storyTitle) parts.push(`图片主题：${context.storyTitle}`);
  if (context.imageDescription) parts.push(`图画描述：${context.imageDescription}`);
  if (context.keywords?.length) parts.push(`可参考词语：${context.keywords.join("、")}`);
  if (context.interviewNotes?.length) {
    parts.push(
      `第二步采访记录：\n${context.interviewNotes
        .map((note, index) => {
          const hint = note.hint ? `（提示：${note.hint}）` : "";
          return `${index + 1}. 问：${note.question}${hint}\n   答：${note.answer}`;
        })
        .join("\n")}`
    );
  }
  return parts.join("\n");
};

const normalizeWordMagic = (value: unknown, highlights: string[]): PolishWordMagic[] => {
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

  return items.length > 0
    ? items
    : highlights.slice(0, 4).map((word) => ({
        word,
        meaning: "让故事更生动",
        example: `可以试着用“${word}”来描述画面。`,
      }));
};

const normalizeVersion = (
  value: unknown,
  title: string,
  fallbackStory: string,
  fallbackTip: string
): PolishVersion => {
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
};

export const polishSystemPrompt = `你是一名温柔、专业的小学一年级语文老师，正在帮助7岁孩子完成“看图说话”。

你的任务不是替孩子写成人作文，而是把孩子已经讲出来的内容变得更清楚、更连贯、更好听。

请严格遵守：
1. 润色主线以“孩子第三步完整讲述”为主，不要完全改成采访笔记。
2. 如果孩子第三步漏掉了重要图画信息，可以参考“第二步采访记录”和“图画参考信息”轻轻补充回来。
3. 如果第三步原话与采访记录冲突，优先相信第三步原话。
4. 不凭空增加参考信息里也没有的主要人物、地点、事件和结局。
5. 可以补充自然的连接词、顺序词、简单形容词和动作词。
6. 语言适合一年级孩子听懂、朗读和模仿，避免成人化、复杂成语和过度华丽。
7. 先肯定孩子做得好的地方，再给一个很小、很具体的改进建议。
8. “保留童真版”要轻润色，尽量保留孩子原来的说法和语气。
9. “优秀范文版”可以更完整、更顺，但仍然要像一年级优秀看图说话，控制在80到160字。
10. 只输出JSON，不要输出Markdown，不要输出解释。

返回JSON结构必须包含：
{
  "feedback": "一句亲切总评，先夸再鼓励。",
  "strengths": ["孩子做得好的地方1", "孩子做得好的地方2"],
  "improvements": ["下次可以补充的一个小点"],
  "versions": {
    "natural": {
      "title": "保留童真版",
      "story": "轻润色后的故事",
      "coachTip": "为什么这样改，孩子能听懂的一句话"
    },
    "excellent": {
      "title": "优秀范文版",
      "story": "更完整、更连贯的故事",
      "coachTip": "这版最值得学习的一句话"
    }
  },
  "polishedStory": "必须与versions.excellent.story完全一致",
  "highlights": ["好词1", "好词2", "好词3"],
  "wordMagic": [
    { "word": "好词", "meaning": "这个词让哪里更生动", "example": "适合孩子模仿的一句短例句" }
  ],
  "readingTip": "朗读这个故事时的小提示",
  "nextChallenge": "下次讲故事时可以尝试的小任务"
}`;

export const buildPolishUserPrompt = (transcript: string, context?: unknown) => {
  const normalizedContext = normalizePromptContext(context);
  const contextText = formatPromptContext(normalizedContext);
  return [
    `孩子第三步完整讲述：\n${transcript.trim()}`,
    contextText ? `图画参考信息（仅用于补充孩子漏掉的画面信息）：\n${contextText}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
};

export const safeParsePolishJson = (raw: string): Record<string, unknown> => {
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

export const normalizePolishBody = (
  parsed: Record<string, unknown>,
  transcript: string,
  provider: string,
  model: string
): NormalizedPolishBody => {
  const fallbackStory = transcript.trim() || "我讲了一个有趣的故事。";
  const feedback = asText(parsed.feedback) || DEFAULT_FEEDBACK;
  const rawHighlights = asTextList(parsed.highlights);
  const versionsRecord =
    parsed.versions && typeof parsed.versions === "object"
      ? (parsed.versions as Record<string, unknown>)
      : {};
  const oldPolishedStory = asText(parsed.polishedStory);

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

  const highlights = rawHighlights.length > 0 ? rawHighlights : normalizeWordMagic(parsed.wordMagic, []).map((item) => item.word);
  const wordMagic = normalizeWordMagic(parsed.wordMagic, highlights);

  return {
    feedback,
    polishedStory: excellent.story,
    highlights,
    versions: { natural, excellent },
    strengths: asTextList(parsed.strengths, ["能把画面里的事情说出来"]),
    improvements: asTextList(parsed.improvements, ["下次可以加一句人物的心情"]),
    wordMagic,
    readingTip: asText(parsed.readingTip) || DEFAULT_READING_TIP,
    nextChallenge: asText(parsed.nextChallenge) || DEFAULT_NEXT_CHALLENGE,
    ai: { provider, model },
  };
};

export const formatPolishFailure = (err: unknown, provider: string): { message: string; detail: string } => {
  const parts: string[] = [`provider=${provider}`];

  if (typeof err === "string") {
    parts.push(err);
  } else if (err instanceof Error) {
    parts.push(`${err.name}: ${err.message || "(no message)"}`);
    const anyErr = err as Error & { status?: number; code?: unknown; error?: unknown; cause?: unknown };
    if (typeof anyErr.status === "number") parts.push(`HTTP ${anyErr.status}`);
    if (anyErr.code != null && anyErr.code !== "") parts.push(`code=${String(anyErr.code)}`);
    if (anyErr.error != null) {
      try {
        parts.push(`upstream=${JSON.stringify(anyErr.error).slice(0, 1500)}`);
      } catch {
        parts.push(`upstream=${String(anyErr.error)}`);
      }
    }
    if (anyErr.cause != null) {
      parts.push(`cause=${anyErr.cause instanceof Error ? anyErr.cause.message : String(anyErr.cause)}`);
    }
  } else if (err && typeof err === "object") {
    try {
      parts.push(JSON.stringify(err).slice(0, 2000));
    } catch {
      parts.push(Object.prototype.toString.call(err));
    }
  } else {
    parts.push(String(err));
  }

  const detail = parts.filter(Boolean).join(" | ") || "unknown_error";
  return { message: detail.length > 400 ? `${detail.slice(0, 400)}...` : detail, detail };
};
