export type PolishStoryResult = {
  feedback: string;
  polishedStory: string;
  highlights: string[];
  ai?: { provider: string; model: string };
  polishFallback?: boolean;
  polishError?: string;
  polishDetail?: string;
};

/** 相同原文只发一次 HTTP，避免 React StrictMode 下 effect 双跑导致智谱等 429 */
const polishInflight = new Map<string, Promise<PolishStoryResult>>();

export async function polishStory(childTranscript: string): Promise<PolishStoryResult> {
  const existing = polishInflight.get(childTranscript);
  if (existing) return existing;

  const promise = polishStoryOnce(childTranscript).finally(() => {
    queueMicrotask(() => {
      if (polishInflight.get(childTranscript) === promise) {
        polishInflight.delete(childTranscript);
      }
    });
  });
  polishInflight.set(childTranscript, promise);
  return promise;
}

async function polishStoryOnce(childTranscript: string): Promise<PolishStoryResult> {
  try {
    const response = await fetch("/api/ai/polish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: childTranscript }),
    });

    let body: Record<string, unknown> = {};
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      /* ignore */
    }

    if (!response.ok) {
      console.error("AI Polish HTTP error:", response.status, body);
      return {
        feedback: "你真棒！说得很清楚。",
        polishedStory: childTranscript,
        highlights: [],
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
      };
    }

    const feedback = typeof body.feedback === "string" ? body.feedback : "你真棒！说得很清楚。";
    const polishedStory =
      typeof body.polishedStory === "string" ? body.polishedStory : childTranscript;
    const highlights = Array.isArray(body.highlights)
      ? (body.highlights as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    const ai =
      body.ai && typeof body.ai === "object" && body.ai !== null
        ? (body.ai as { provider?: string; model?: string })
        : undefined;

    return {
      feedback,
      polishedStory,
      highlights,
      ...(ai?.provider && ai?.model ? { ai: { provider: ai.provider, model: ai.model } } : {}),
    };
  } catch (error) {
    console.error("AI Polish Error:", error);
    return {
      feedback: "你真棒！说得很清楚。",
      polishedStory: childTranscript,
      highlights: [],
      polishFallback: true,
      polishError: "NETWORK_OR_PARSE",
    };
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
