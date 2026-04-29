import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Star, Play, RotateCcw, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { polishStory, type PolishStoryResult } from './services/ai';
import { downloadImage } from './lib/download';
import { speak, preloadTts } from './lib/tts';

interface Props {
  transcript: string;
  originalAudioUrl: string | null;
  imageUrl: string;
  onRestart: () => void;
  onFinishLesson: () => void;
}

export default function Step4StoryMagician({
  transcript,
  originalAudioUrl,
  imageUrl,
  onRestart,
  onFinishLesson,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PolishStoryResult | null>(null);

  useEffect(() => {
    preloadTts("听听看，魔法师给你的故事加了一点料，是不是更好听啦？");
  }, []);

  useEffect(() => {
    if (result?.polishedStory) preloadTts(result.polishedStory);
  }, [result?.polishedStory]);

  useEffect(() => {
    let cancelled = false;
    async function getMagic() {
      const data = await polishStory(transcript);
      if (cancelled) return;
      setResult(data);
      setLoading(false);
      void speak("听听看，魔法师给你的故事加了一点料，是不是更好听啦？");
    }
    void getMagic();
    return () => {
      cancelled = true;
    };
  }, [transcript]);

  const handlePlayPolished = () => {
    if (result?.polishedStory) {
      void speak(result.polishedStory);
    }
  };

  const handlePlayOriginal = () => {
    if (originalAudioUrl) {
      const audio = new Audio(originalAudioUrl);
      audio.play();
    }
  };

  const handleDownload = () => {
    downloadImage(imageUrl, 'my-story-dream.jpg');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-8xl"
        >
          🪄
        </motion.div>
        <h2 className="text-2xl font-bold text-primary animate-pulse">故事魔法师正在施法...</h2>
        <p className="text-slate-500">正在为你润色精彩的故事</p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-8 p-4 max-w-4xl mx-auto pb-20">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
          <Sparkles className="w-8 h-8" /> 第四步：AI 故事魔法师
        </h2>
        <p className="text-slate-500">哇！你的故事太棒了，魔法师为你点赞！</p>
      </div>

      {result.polishFallback && (
        <div className="w-full max-w-3xl mx-auto rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-bold">未能调用 AI 润色</p>
          <p className="mt-1 opacity-90">
            {result.polishError === "NO_AI_PROVIDER"
              ? "服务器未检测到有效的 LLM Key。请检查 packages/server/.env 是否填写 DEEPSEEK_API_KEY、GLM_API_KEY 等，并重启 npm run dev:server。"
              : result.polishDetail || "已改为显示你的原话。请打开浏览器控制台（F12）查看 Network 里 /api/ai/polish 的返回。"}
          </p>
        </div>
      )}

      {result.ai && (
        <p className="text-center text-xs text-emerald-600 w-full">
          本次润色模型：{result.ai.provider} · {result.ai.model}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-yellow-500 font-bold">
              <Star className="w-5 h-5 fill-current" />
              魔法师的夸奖
            </div>
            <div className="prose prose-slate">
              <ReactMarkdown>{result.feedback}</ReactMarkdown>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {(result.highlights ?? []).map((h: string) => (
                <span key={h} className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-bold">
                  ✨ {h}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 bg-white/40"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-600">你的原话：</h4>
              {originalAudioUrl && (
                <button
                  onClick={handlePlayOriginal}
                  className="flex items-center gap-2 text-sm font-bold text-secondary hover:text-secondary/80 transition-colors"
                >
                  <Play className="w-4 h-4 fill-current" /> 回听录音
                </button>
              )}
            </div>
            <p className="text-slate-500 italic leading-relaxed">
              “{transcript}”
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-6 space-y-4 border-primary/20 bg-primary/5 h-fit"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Sparkles className="w-5 h-5" />
              魔法润色版
            </div>
            <button
              onClick={handlePlayPolished}
              className="p-2 bg-primary text-white rounded-full hover:scale-110 transition-transform"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          </div>
          <div className="bg-white p-4 rounded-2xl border-2 border-primary/10 min-h-[150px]">
            <p className="text-lg text-slate-700 leading-relaxed italic">
              “{result.polishedStory}”
            </p>
          </div>
          <p className="text-xs text-slate-400 text-center">点击上方播放键，跟着魔法师读一遍吧！</p>
        </motion.div>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <button onClick={handleDownload} className="btn-kid-primary flex items-center gap-2">
          <Download className="w-5 h-5" /> 保存这张画
        </button>
        <button onClick={onRestart} className="btn-kid-secondary flex items-center gap-2">
          <RotateCcw className="w-5 h-5" /> 再讲一个
        </button>
        <button onClick={onFinishLesson} className="btn-kid-success flex items-center gap-2">
          <Sparkles className="w-5 h-5" /> 完成本关
        </button>
      </div>
    </div>
  );
}
