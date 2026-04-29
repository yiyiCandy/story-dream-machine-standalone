export interface Hotspot {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  label: string;
  words: string[];
  audioText: string;
}

export interface Question {
  id: string;
  question: string;
  hint: string;
  key: string; // which part of the 4W it answers
}

export interface StoryData {
  id: string;
  imageUrl: string;
  imagePrompt: string;
  title: string;
  hotspots: Hotspot[];
  questions: Question[];
  disableAI?: boolean; // If true, use imageUrl directly and skip AI generation
}

export type AppStep = 'treasure-hunt' | 'ai-reporter' | 'my-masterpiece' | 'story-magician';
