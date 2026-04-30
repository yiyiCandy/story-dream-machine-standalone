import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpenText,
  ClipboardList,
  Eraser,
  Image as ImageIcon,
  Mic,
  MicOff,
  PenLine,
  Quote,
  Send,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { StoryData } from './types';
import { cancelSpeaking, speak, preloadTts } from './lib/tts';

interface Props {
  onComplete: (fullTranscript: string, audioUrl: string | null) => void;
  imageUrl: string;
  previousAnswers: Record<string, string>;
  story: StoryData;
}

type InterviewNote = {
  id: string;
  index: number;
  question: string;
  answer: string;
  hint: string;
};

const SKIPPED_MARKERS = new Set(['（跳过了）', '这题我先跳过']);

function cleanAnswer(value: string | undefined): string {
  const trimmed = (value ?? '').trim();
  return SKIPPED_MARKERS.has(trimmed) ? '' : trimmed;
}

function ensureSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return /[。！？.!?]$/.test(trimmed) ? trimmed : `${trimmed}。`;
}

function buildInterviewNotes(story: StoryData, previousAnswers: Record<string, string>): InterviewNote[] {
  return story.questions
    .map((question, index) => ({
      id: question.id,
      index,
      question: question.question,
      answer: cleanAnswer(previousAnswers[question.key]),
      hint: question.hint,
    }))
    .filter((note) => note.answer.length > 0);
}

function buildDraftFromNotes(notes: InterviewNote[]): string {
  return notes.map((note) => ensureSentence(note.answer)).filter(Boolean).join('');
}

function mergeTranscript(base: string, next: string) {
  const cleanBase = base.trim();
  const cleanNext = next.trim();

  if (!cleanBase) return cleanNext;
  if (!cleanNext) return cleanBase;
  return `${cleanBase}${/[。！？.!?]$/.test(cleanBase) ? '' : '。'}${cleanNext}`;
}

function getQuestionBrief(question: string): string {
  const normalized = question
    .replace(/^小朋友[，,]\s*/, '')
    .replace(/[？?]\s*$/, '')
    .trim();

  return normalized.length > 18 ? `${normalized.slice(0, 18)}...` : normalized;
}

export default function Step3MyMasterpiece({ onComplete, imageUrl, previousAnswers, story }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const recognitionStateRef = useRef<'idle' | 'starting' | 'listening' | 'stopping'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingBaseRef = useRef('');

  const interviewNotes = buildInterviewNotes(story, previousAnswers);
  const interviewDraft = buildDraftFromNotes(interviewNotes);
  const hasInterviewDraft = interviewDraft.length > 0;

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        recognitionStateRef.current = 'listening';
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let sessionFinal = '';
        let sessionInterim = '';
        for (let i = 0; i < event.results.length; ++i) {
          const segment = event.results[i][0]?.transcript ?? '';
          if (event.results[i].isFinal) {
            sessionFinal += segment;
          } else {
            sessionInterim += segment;
          }
        }
        setTranscript(mergeTranscript(recordingBaseRef.current, `${sessionFinal}${sessionInterim}`));
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event);
        recognitionStateRef.current = 'idle';
        setIsRecording(false);
      };

      recognition.onend = () => {
        recognitionStateRef.current = 'idle';
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
    return () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      recognitionStateRef.current = 'idle';
      if (recognition) {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        try {
          recognition.abort();
        } catch {
          // ignore cleanup failures
        }
      }
      mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    preloadTts("参考采访笔记，把故事从头到尾完整讲一遍吧。");
    preloadTts("已经根据采访笔记整理好草稿啦，你可以继续修改。");
  }, []);

  const stopMediaRecorder = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    try {
      recorder.stop();
    } catch (err) {
      console.error('Media recorder stop error:', err);
    }
  };

  const stopRecognition = () => {
    const recognition = recognitionRef.current;
    if (recognition && recognitionStateRef.current !== 'idle' && recognitionStateRef.current !== 'stopping') {
      recognitionStateRef.current = 'stopping';
      try {
        recognition.stop();
      } catch (err) {
        console.error('Speech recognition stop error:', err);
        recognitionStateRef.current = 'idle';
      }
    }
    stopMediaRecorder();
    setIsRecording(false);
  };

  const startRecognition = async () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (recognitionStateRef.current !== 'idle') return;

    setAudioUrl(null);
    audioChunksRef.current = [];
    cancelSpeaking();
    recognitionStateRef.current = 'starting';
    recordingBaseRef.current = transcript.trim();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      recognition.start();
    } catch (err) {
      console.error('Failed to start recording:', err);
      recognitionStateRef.current = 'idle';
      mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
      try {
        recognition.abort();
      } catch {
        // ignore reset failure
      }
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (recognitionStateRef.current === 'listening' || recognitionStateRef.current === 'starting') {
      stopRecognition();
      return;
    }
    void startRecognition();
  };

  const handleUseInterviewDraft = () => {
    if (!hasInterviewDraft) return;
    if (isRecording) {
      stopRecognition();
    }
    recordingBaseRef.current = interviewDraft;
    setTranscript(interviewDraft);
    setAudioUrl(null);
    void speak("已经根据采访笔记整理好草稿啦，你可以继续修改。");
  };

  const handleResetDraft = () => {
    if (isRecording) {
      stopRecognition();
    }
    recordingBaseRef.current = '';
    setTranscript('');
    setAudioUrl(null);
  };

  const transcriptLength = transcript.trim().length;
  const canSubmit = transcriptLength > 0 && !isRecording;
  const promptWords = story.hotspots.flatMap((hotspot) => hotspot.words.map((word) => ({ id: hotspot.id, word })));

  return (
    <div className="w-full max-w-[1500px] mx-auto px-3 sm:px-5 pb-5">
      <div className="mb-4 overflow-hidden rounded-[34px] border border-slate-900/10 bg-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <div className="relative flex flex-col gap-4 px-5 py-4 text-white sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,159,67,0.32),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(84,160,255,0.24),transparent_26%)]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-primary-700 shadow-lg shadow-primary-900/30">
              <BookOpenText className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-primary-200">Story Studio</p>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">第三步：完整讲故事</h2>
            </div>
          </div>
          <p className="relative max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
            看着采访笔记和图片，把故事从开头、经过到结尾重新讲一遍。这里写下的内容，才会交给第四步 AI 魔法师润色。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:h-[calc(100vh-245px)] lg:min-h-[560px] lg:max-h-[720px] lg:grid-cols-[240px_minmax(430px,1fr)_280px] xl:grid-cols-[260px_minmax(470px,1fr)_310px] 2xl:grid-cols-[290px_minmax(560px,1fr)_340px]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[34px] border border-white/80 bg-[#fff7e7] shadow-[0_22px_60px_rgba(146,91,28,0.14)]">
          <div className="bg-gradient-to-r from-[#3b2f23] to-[#59412c] px-4 py-3 text-white">
            <p className="flex items-center gap-2 text-sm font-black">
              <ImageIcon className="h-4 w-4 text-primary-200" />
              故事参照
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
            <div className="relative overflow-hidden rounded-[28px] bg-slate-900 p-2 shadow-[0_18px_45px_rgba(15,23,42,0.2)]">
              <div className="aspect-[4/3] overflow-hidden rounded-[22px] bg-slate-800">
                <img
                  src={imageUrl}
                  alt="Story"
                  className="h-full w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-slate-800 shadow">
                看图回忆
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-[26px] border border-amber-200/70 bg-white/75 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-black text-slate-800">可以借用的词</h3>
                <span className="rounded-full bg-primary-100 px-2.5 py-1 text-xs font-bold text-primary-700">
                  {story.hotspots.length} 组
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {story.hotspots.map((hotspot) => (
                  <span
                    key={hotspot.id}
                    className="rounded-full bg-warning/35 px-3 py-1.5 text-sm font-black text-slate-800"
                  >
                    {hotspot.label}
                  </span>
                ))}
              </div>
              <div className="mt-4 max-h-32 overflow-y-auto pr-1 lg:max-h-none">
                <div className="flex flex-wrap gap-2">
                  {promptWords.map(({ id, word }) => (
                    <span
                      key={`${id}-${word}`}
                      className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-[38px] border border-slate-900/10 bg-[#f3dfbd] shadow-[0_28px_85px_rgba(86,55,21,0.2)]">
          <div className="flex shrink-0 flex-col gap-3 border-b border-amber-900/10 bg-[#2f3b4a] px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-amber-200">
                <PenLine className="h-4 w-4" />
                我的完整故事
              </p>
              <h3 className="mt-1 text-2xl font-black">像小作家一样重新讲一遍</h3>
            </div>
            <div className={`shrink-0 rounded-full px-4 py-2 text-sm font-black shadow-inner ${
              isRecording ? 'bg-red-500/20 text-red-100 ring-1 ring-red-300/50' : 'bg-emerald-400/15 text-emerald-100 ring-1 ring-emerald-300/40'
            }`}>
              {isRecording ? '● 正在录音' : transcriptLength > 0 ? `已写 ${transcriptLength} 字` : '故事纸是空的'}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-5">
            <div className="flex min-h-[360px] flex-1 flex-col overflow-hidden rounded-[32px] border border-amber-200 bg-[#fffdf7] shadow-inner lg:min-h-0">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-100 bg-white/70 px-4 py-3">
                <div>
                  <p className="text-sm font-black text-slate-800">故事纸</p>
                  <p className="text-xs text-slate-500">
                    {isRecording ? '你说的话会实时出现在这里' : '参考两边的信息，但用你自己的话完整表达'}
                  </p>
                </div>
                {isRecording && (
                  <motion.div
                    animate={{ opacity: [0.45, 1, 0.45] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-600"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    REC
                  </motion.div>
                )}
              </div>

              <textarea
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder={isRecording ? "我正在听，你的话会马上出现在这里..." : "先看右边采访笔记，再从“有一天……”开始，把图片里的故事完整讲出来吧。"}
                className="min-h-0 flex-1 resize-none overflow-y-auto bg-transparent px-5 py-5 text-lg leading-9 text-slate-800 outline-none placeholder:text-slate-400 focus:bg-white/35 sm:px-6"
              />
            </div>
          </div>

          <div className="shrink-0 border-t border-amber-900/10 bg-white/80 px-4 py-4 backdrop-blur sm:px-5">
            <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleRecording}
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-4 shadow-[0_18px_42px_rgba(15,23,42,0.24)] transition-all ${
                    isRecording
                      ? 'scale-105 animate-pulse border-red-200 bg-gradient-to-br from-red-500 to-red-700'
                      : 'border-white bg-gradient-to-br from-secondary-500 via-secondary-700 to-slate-900 hover:scale-105'
                  }`}
                  title={isRecording ? '停止录音' : '开始录音'}
                >
                  {isRecording ? <MicOff className="h-8 w-8 text-white" /> : <Mic className="h-8 w-8 text-white" />}
                </button>
                <div>
                  <p className="font-black text-slate-800">
                    {isRecording ? '说完再点一次话筒' : '点话筒讲，或直接打字'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {isRecording ? '故事会同步写进上面的故事纸' : '录音会接在已有文字后面'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 2xl:min-w-[520px]">
                <button
                  onClick={handleUseInterviewDraft}
                  disabled={!hasInterviewDraft}
                  className={`min-h-touch rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                    hasInterviewDraft
                      ? 'bg-amber-400 text-slate-900 shadow-md hover:bg-amber-300'
                      : 'cursor-not-allowed bg-slate-200 text-slate-400'
                  }`}
                  title="把采访笔记整理成一段草稿"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Wand2 className="h-4 w-4" /> 生成草稿
                  </span>
                </button>
                <button
                  onClick={handleResetDraft}
                  className="min-h-touch rounded-2xl bg-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition-all hover:bg-slate-300"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Eraser className="h-4 w-4" /> 清空重说
                  </span>
                </button>
                <button
                  onClick={() => onComplete(transcript, audioUrl)}
                  disabled={!canSubmit}
                  className={`min-h-touch rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                    canSubmit
                      ? 'bg-gradient-to-r from-primary-500 via-orange-500 to-amber-400 text-white shadow-lg hover:scale-[1.02]'
                      : 'cursor-not-allowed bg-slate-300 text-slate-500'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Send className="h-4 w-4" /> 交给魔法师
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="min-h-0 overflow-hidden rounded-[34px] border border-secondary-100 bg-[#eef7ff] shadow-[0_22px_60px_rgba(38,94,142,0.14)]">
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 bg-gradient-to-r from-secondary-700 to-secondary-500 px-5 py-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary-100">Route Notes</p>
                  <h4 className="mt-1 flex items-center gap-2 text-xl font-black">
                    <ClipboardList className="h-5 w-5" /> 采访路线
                  </h4>
                </div>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black">
                  {interviewNotes.length} 条
                </span>
              </div>
            </div>

            {interviewNotes.length > 0 ? (
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pr-3">
                {interviewNotes.map((note) => (
                  <div key={note.id} className="rounded-[26px] border border-secondary-100 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="rounded-full bg-secondary-50 px-2.5 py-1 text-xs font-black text-secondary-700">
                        第 {note.index + 1} 问
                      </p>
                      <Sparkles className="h-4 w-4 shrink-0 text-primary-500" />
                    </div>
                    <p className="text-sm font-black leading-6 text-slate-700">{getQuestionBrief(note.question)}</p>
                    <div className="mt-3 rounded-2xl bg-secondary-50/80 px-3 py-2">
                      <p className="flex gap-2 text-sm font-bold leading-6 text-slate-800">
                        <Quote className="mt-0.5 h-4 w-4 shrink-0 text-secondary-500" />
                        <span>{note.answer}</span>
                      </p>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">提示：{note.hint}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 items-center p-4">
                <div className="rounded-[28px] border border-slate-100 bg-white px-5 py-8 text-center shadow-sm">
                  <p className="font-black text-slate-800">还没有采访回答</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">没关系，看着图片和关键词，也可以直接完整讲一遍。</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
