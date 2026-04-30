import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpenCheck,
  CheckCircle2,
  Download,
  Lightbulb,
  Mic2,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Wand2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  buildPolishStoryContext,
  polishStory,
  type PolishStoryResult,
  type PolishVersionKey,
} from './services/ai';
import { downloadImage } from './lib/download';
import { speak, preloadTts } from './lib/tts';
import { StoryData } from './types';

interface Props {
  transcript: string;
  originalAudioUrl: string | null;
  imageUrl: string;
  previousAnswers: Record<string, string>;
  story: StoryData;
  onRestart: () => void;
  onFinishLesson: () => void;
}

export default function Step4StoryMagician({
  transcript,
  originalAudioUrl,
  imageUrl,
  previousAnswers,
  story,
  onRestart,
  onFinishLesson,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PolishStoryResult | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<PolishVersionKey>('excellent');

  useEffect(() => {
    preloadTts("故事魔法报告准备好了，来看看你的故事变得多精彩吧。");
  }, []);

  useEffect(() => {
    if (!result) return;
    preloadTts(result.versions.excellent.story);
    preloadTts(result.versions.natural.story);
  }, [result]);

  useEffect(() => {
    let cancelled = false;
    async function getMagic() {
      const data = await polishStory(transcript, buildPolishStoryContext(story, previousAnswers));
      if (cancelled) return;
      setResult(data);
      setLoading(false);
      setSelectedVersion('excellent');
      void speak("故事魔法报告准备好了，来看看你的故事变得多精彩吧。");
    }
    void getMagic();
    return () => {
      cancelled = true;
    };
  }, [transcript, previousAnswers, story]);

  const handlePlayPolished = () => {
    if (result) {
      void speak(result.versions[selectedVersion].story);
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

  const versionOptions: Array<{
    key: PolishVersionKey;
    label: string;
    helper: string;
  }> = [
    { key: 'excellent', label: result.versions.excellent.title, helper: '更完整，更像范文' },
    { key: 'natural', label: result.versions.natural.title, helper: '保留你的童真语气' },
  ];
  const activeVersion = result.versions[selectedVersion];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-10">
      <div className="mb-5 overflow-hidden rounded-[34px] border border-slate-900/10 bg-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <div className="relative flex flex-col gap-4 px-5 py-5 text-white sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(255,159,67,0.35),transparent_28%),radial-gradient(circle_at_84%_16%,rgba(84,160,255,0.24),transparent_28%)]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-400 to-primary-700 shadow-lg shadow-primary-900/30">
              <BookOpenCheck className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-primary-200">Story Magic Report</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">第四步：故事魔法报告</h2>
            </div>
          </div>
          <p className="relative max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
            AI 语文老师会先夸夸你讲得好的地方，再给两个版本：一个保留你的童真，一个更像优秀范文。
          </p>
        </div>
      </div>

      {result.polishFallback && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-bold">未能调用 AI 润色</p>
          <p className="mt-1 opacity-90">
            {result.polishError === "NO_AI_PROVIDER"
              ? "服务器未检测到有效的 LLM Key。请检查项目根目录 .env 是否填写 DEEPSEEK_API_KEY、GLM_API_KEY 等，并重启本地服务。"
              : result.polishDetail || "已改为显示你的原话。请打开浏览器控制台（F12）查看 Network 里 /api/ai/polish 的返回。"}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <div className="space-y-5">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[32px] border border-white bg-white/70 p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-black text-slate-700">我的原话</h4>
              {originalAudioUrl && (
                <button
                  onClick={handlePlayOriginal}
                  className="flex items-center gap-2 rounded-full bg-secondary-50 px-3 py-2 text-sm font-bold text-secondary-700 transition-colors hover:bg-secondary-100"
                >
                  <Play className="w-4 h-4 fill-current" /> 回听录音
                </button>
              )}
            </div>
            <p className="max-h-40 overflow-y-auto rounded-2xl bg-white/70 p-4 text-sm italic leading-7 text-slate-500">
              “{transcript}”
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="overflow-hidden rounded-[32px] border border-white bg-white/90 shadow-[0_18px_55px_rgba(15,23,42,0.1)]"
          >
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-4 text-slate-950">
              <div className="flex items-center gap-2 font-black">
                <Star className="h-5 w-5 fill-current" />
                AI 语文老师的反馈
              </div>
            </div>
            <div className="space-y-5 p-5">
              <div className="rounded-3xl bg-amber-50 px-4 py-4">
                <div className="prose prose-slate max-w-none text-slate-800">
                  <ReactMarkdown>{result.feedback}</ReactMarkdown>
                </div>
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-800">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" /> 我做得好的地方
                </h3>
                <div className="space-y-2">
                  {result.strengths.map((item) => (
                    <div key={item} className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold leading-6 text-emerald-800">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-800">
                  <Lightbulb className="h-5 w-5 text-primary-500" /> 下次试一试
                </h3>
                <div className="space-y-2">
                  {result.improvements.map((item) => (
                    <div key={item} className="rounded-2xl bg-primary-50 px-4 py-3 text-sm font-bold leading-6 text-primary-800">
                      {item}
                    </div>
                  ))}
                  <div className="rounded-2xl border border-dashed border-primary-200 bg-white px-4 py-3 text-sm font-bold leading-6 text-slate-700">
                    小任务：{result.nextChallenge}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-[32px] border border-secondary-100 bg-[#eef7ff] p-5 shadow-[0_18px_55px_rgba(38,94,142,0.12)]"
          >
            <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-800">
              <Wand2 className="h-5 w-5 text-secondary-600" /> 魔法师帮我加了什么
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {result.wordMagic.map((item) => (
                <div key={`${item.word}-${item.meaning}`} className="rounded-3xl bg-white p-4 shadow-sm">
                  <p className="text-xl font-black text-secondary-700">{item.word}</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{item.meaning}</p>
                  <p className="mt-3 rounded-2xl bg-secondary-50 px-3 py-2 text-xs leading-5 text-slate-500">
                    {item.example}
                  </p>
                </div>
              ))}
            </div>
          </motion.section>

        </div>

        <div className="space-y-5">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="overflow-hidden rounded-[36px] border border-slate-900/10 bg-[#f4dfba] shadow-[0_24px_70px_rgba(86,55,21,0.18)]"
          >
            <div className="flex flex-col gap-4 bg-[#2f3b4a] px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-amber-200">
                  <Sparkles className="h-4 w-4" /> 双版本故事
                </p>
                <h3 className="mt-1 text-2xl font-black">选一个版本读一读</h3>
              </div>
              {result.ai && (
                <p className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold text-slate-100">
                  {result.ai.provider} · {result.ai.model}
                </p>
              )}
            </div>

            <div className="p-5">
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {versionOptions.map((option) => {
                  const isActive = selectedVersion === option.key;
                  return (
                    <button
                      key={option.key}
                      onClick={() => setSelectedVersion(option.key)}
                      className={`rounded-3xl px-4 py-4 text-left transition-all ${
                        isActive
                          ? 'bg-slate-950 text-white shadow-xl shadow-slate-900/20'
                          : 'bg-white/80 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <p className="text-lg font-black">{option.label}</p>
                      <p className={`mt-1 text-sm ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>{option.helper}</p>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-[32px] border border-amber-200 bg-[#fffdf7] p-5 shadow-inner">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-primary-700">{activeVersion.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{activeVersion.coachTip}</p>
                  </div>
                  <button
                    onClick={handlePlayPolished}
                    className="flex min-h-touch items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-secondary-600 to-slate-900 px-5 py-3 font-black text-white shadow-lg transition-transform hover:scale-[1.02]"
                  >
                    <Play className="h-5 w-5 fill-current" />
                    朗读这一版
                  </button>
                </div>

                <p className="rounded-[26px] bg-white px-5 py-5 text-lg font-medium leading-9 text-slate-800 shadow-sm">
                  “{activeVersion.story}”
                </p>
              </div>

              <div className="mt-4 rounded-3xl bg-white/70 p-4">
                <p className="flex items-center gap-2 text-sm font-black text-slate-700">
                  <Mic2 className="h-4 w-4 text-primary-600" /> 朗读小提示
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{result.readingTip}</p>
              </div>
            </div>
          </motion.section>

          <div className="flex flex-wrap justify-center gap-3">
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
      </div>
    </div>
  );
}
