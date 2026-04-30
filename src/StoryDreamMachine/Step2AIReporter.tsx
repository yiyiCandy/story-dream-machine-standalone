import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Mic, MicOff, Send, SkipForward, Sparkles } from 'lucide-react';
import { Question, StoryData } from './types';
import { cancelSpeaking, speak, preloadTts } from './lib/tts';

interface Props {
  story: StoryData;
  onComplete: (answers: Record<string, string>) => void;
}

const FEEDBACK_PHRASES = ["说得真好！", "我知道了！", "太棒了！", "你观察得真仔细！", "听起来很有趣！"];
const SKIP_FEEDBACK = "那回答下一个问题吧";
const SKIP_ANSWER_TEXT = "这题我先跳过";

type ChatMessage = {
  id: string;
  role: 'reporter' | 'child' | 'system';
  text: string;
  hint?: string;
};

function makeQuestionMessage(question: Question): ChatMessage {
  return {
    id: `question-${question.id}`,
    role: 'reporter',
    text: question.question,
    hint: question.hint,
  };
}

function getInitialMessages(story: StoryData): ChatMessage[] {
  const firstQuestion = story.questions[0];
  return firstQuestion ? [makeQuestionMessage(firstQuestion)] : [];
}

export default function Step2AIReporter({ story, onComplete }: Props) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => getInitialMessages(story));
  const recognitionRef = useRef<any>(null);
  const recognitionStateRef = useRef<'idle' | 'starting' | 'listening' | 'stopping'>('idle');
  const advanceTimeoutRef = useRef<number | null>(null);
  const advanceSequenceRef = useRef(0);
  const lastSpokenQuestionIdRef = useRef<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const currentQuestion = story.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === story.questions.length - 1;
  const canSend = transcript.trim().length > 0 && !isRecording && !isAdvancing;

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setIsRecording(false);
    setIsAdvancing(false);
    setAnswers({});
    setTranscript('');
    setMessages(getInitialMessages(story));
    lastSpokenQuestionIdRef.current = null;
  }, [story]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        recognitionStateRef.current = 'listening';
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        setTranscript(fullTranscript);
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
      if (advanceTimeoutRef.current) {
        window.clearTimeout(advanceTimeoutRef.current);
      }
      advanceSequenceRef.current += 1;
    };
  }, []);

  useEffect(() => {
    story.questions.forEach((q) => preloadTts(q.question));
    FEEDBACK_PHRASES.forEach((p) => preloadTts(p));
    preloadTts(SKIP_FEEDBACK);
  }, [story]);

  useEffect(() => {
    const next = story.questions[currentQuestionIndex + 1];
    if (next) preloadTts(next.question);
  }, [currentQuestionIndex, story]);

  useEffect(() => {
    if (currentQuestionIndex === 0) return;
    const nextQuestion = story.questions[currentQuestionIndex];
    if (!nextQuestion) return;

    setMessages((prev) => {
      const id = `question-${nextQuestion.id}`;
      if (prev.some((message) => message.id === id)) return prev;
      return [...prev, makeQuestionMessage(nextQuestion)];
    });
  }, [currentQuestionIndex, story]);

  useEffect(() => {
    const firstQuestion = story.questions[0];
    if (!firstQuestion) return;
    if (currentQuestionIndex !== 0) return;
    if (lastSpokenQuestionIdRef.current === firstQuestion.id) return;
    lastSpokenQuestionIdRef.current = firstQuestion.id;
    void speak(firstQuestion.question);
  }, [currentQuestionIndex, story]);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) return;

    const frame = window.requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: messages.length <= 1 ? 'auto' : 'smooth',
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, isAdvancing]);

  const stopRecognition = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (recognitionStateRef.current === 'idle' || recognitionStateRef.current === 'stopping') {
      setIsRecording(false);
      return;
    }
    recognitionStateRef.current = 'stopping';
    try {
      recognition.stop();
    } catch (err) {
      console.error('Speech recognition stop error:', err);
      recognitionStateRef.current = 'idle';
      setIsRecording(false);
    }
  };

  const startRecognition = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      alert("抱歉，您的浏览器不支持语音识别，请尝试手动输入或更换浏览器（推荐使用 Chrome）。");
      return;
    }

    if (recognitionStateRef.current !== 'idle') {
      return;
    }

    recognitionStateRef.current = 'starting';
    setTranscript('');
    cancelSpeaking();

    try {
      recognition.start();
    } catch (err) {
      console.error('Speech recognition start error:', err);
      recognitionStateRef.current = 'idle';
      setIsRecording(false);
      try {
        recognition.abort();
      } catch {
        // ignore reset failure
      }
    }
  };

  const toggleRecording = () => {
    if (recognitionStateRef.current === 'listening' || recognitionStateRef.current === 'starting') {
      stopRecognition();
      return;
    }
    startRecognition();
  };

  const submitAnswer = (rawAnswer: string) => {
    if (!currentQuestion || isAdvancing) return;

    const trimmedTranscript = rawAnswer.trim();
    const isSkipped = trimmedTranscript.length === 0;
    const newAnswers = { ...answers, [currentQuestion.key]: trimmedTranscript };
    const feedbackText = isSkipped
      ? SKIP_FEEDBACK
      : FEEDBACK_PHRASES[Math.floor(Math.random() * FEEDBACK_PHRASES.length)];
    const messageSeed = `${currentQuestion.id}-${Date.now()}`;

    setAnswers(newAnswers);
    setMessages((prev) => [
      ...prev,
      {
        id: `answer-${messageSeed}`,
        role: 'child',
        text: isSkipped ? SKIP_ANSWER_TEXT : trimmedTranscript,
      },
      {
        id: `feedback-${messageSeed}`,
        role: 'system',
        text: feedbackText,
      },
    ]);
    setTranscript('');
    setIsAdvancing(true);
    cancelSpeaking();
    advanceSequenceRef.current += 1;
    const myAdvanceSeq = advanceSequenceRef.current;

    if (advanceTimeoutRef.current) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }

    const finishAdvance = () => {
      if (myAdvanceSeq !== advanceSequenceRef.current) return;
      if (advanceTimeoutRef.current) {
        window.clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
      setIsAdvancing(false);
      if (currentQuestionIndex < story.questions.length - 1) {
        const nextQuestion = story.questions[currentQuestionIndex + 1];
        if (nextQuestion) {
          lastSpokenQuestionIdRef.current = nextQuestion.id;
        }
        setCurrentQuestionIndex((prev) => prev + 1);
        if (nextQuestion) {
          window.setTimeout(() => {
            if (myAdvanceSeq !== advanceSequenceRef.current) return;
            void speak(nextQuestion.question);
          }, 120);
        }
      } else {
        onComplete(newAnswers);
      }
    };

    advanceTimeoutRef.current = window.setTimeout(() => {
      finishAdvance();
    }, 5000);

    void (async () => {
      const minDelay = new Promise((resolve) => window.setTimeout(resolve, 950));
      try {
        await Promise.all([speak(feedbackText), minDelay]);
      } catch {
        await minDelay;
      }
      finishAdvance();
    })();
  };

  const handleSend = () => {
    submitAnswer(transcript);
  };

  const handleSkip = () => {
    if (isAdvancing) return;
    setTranscript('');
    if (recognitionStateRef.current === 'listening' || recognitionStateRef.current === 'starting') {
      stopRecognition();
    }
    submitAnswer('');
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && canSend) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-8 p-4 max-w-5xl mx-auto py-10">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-secondary flex items-center justify-center gap-2">
          <MessageCircle className="w-8 h-8" /> 第二步：AI 小记者采访
        </h2>
        <p className="text-slate-500">像聊天一样，一问一答，把你看到的故事慢慢说出来吧！</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px,minmax(0,1fr)] items-start">
        <div className="rounded-[28px] bg-gradient-to-br from-secondary/20 via-white to-accent/20 border border-white/80 shadow-[0_18px_60px_rgba(56,189,248,0.18)] p-6 flex flex-col items-center text-center gap-5">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2.2, repeat: Infinity }}
            className="w-28 h-28 bg-white rounded-full flex items-center justify-center border-4 border-secondary/30 shadow-lg"
          >
            <span className="text-6xl">🐒</span>
          </motion.div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-800">小记者上线啦</h3>
            <p className="text-sm leading-6 text-slate-500">
              它会一题一题地问你，你可以打字，也可以点话筒把答案说出来。
            </p>
          </div>

          <div className="w-full rounded-3xl bg-white/85 px-4 py-4 text-left shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary/80">Progress</p>
            <p className="mt-2 text-2xl font-black text-slate-800">
              {Math.min(currentQuestionIndex + 1, story.questions.length)} / {story.questions.length}
            </p>
            <div className="mt-4 flex gap-2">
              {story.questions.map((question, idx) => {
                const answered = messages.some((message) => message.id.startsWith(`answer-${question.id}-`));
                const active = idx === currentQuestionIndex;
                return (
                  <div
                    key={question.id}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      answered ? 'bg-secondary' : active ? 'bg-accent' : 'bg-slate-200'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <div className="w-full rounded-3xl bg-slate-900 text-white px-4 py-4 shadow-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>{isRecording ? '正在听你说话...' : isAdvancing ? '小记者在准备下一题...' : '轮到你回答啦'}</span>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/80 bg-white/80 backdrop-blur-xl shadow-[0_26px_80px_rgba(15,23,42,0.12)] overflow-hidden min-h-[620px] flex flex-col">
          <div className="px-5 py-4 sm:px-6 border-b border-slate-100 bg-white/80 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-800">问一句，答一句</p>
              <p className="text-xs text-slate-400">所有问题和回答都会留在这里，方便回头看看。</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current</p>
              <p className="text-sm font-bold text-secondary">{isLastQuestion ? '最后一题' : `第 ${currentQuestionIndex + 1} 题`}</p>
            </div>
          </div>

          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(236,253,245,0.72))]"
          >
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((message) => {
                  const isReporter = message.role === 'reporter';
                  const isChild = message.role === 'child';

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isChild ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[88%] ${message.role === 'system' ? 'mx-auto' : ''}`}>
                        {isReporter && (
                          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-secondary">
                            <span className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-lg">🐒</span>
                            <span>AI 小记者</span>
                          </div>
                        )}

                        {isReporter && (
                          <div className="rounded-[24px] rounded-tl-md bg-white border border-secondary/15 shadow-sm px-4 py-3">
                            <p className="text-base font-medium leading-7 text-slate-800">{message.text}</p>
                            {message.hint && (
                              <p className="mt-2 text-xs leading-5 text-slate-400">提示：{message.hint}</p>
                            )}
                          </div>
                        )}

                        {isChild && (
                          <div className="rounded-[24px] rounded-br-md bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-lg px-4 py-3 text-white">
                            <p className="text-base font-medium leading-7">{message.text}</p>
                          </div>
                        )}

                        {message.role === 'system' && (
                          <div className="inline-flex items-center gap-2 rounded-full bg-accent/40 text-slate-700 px-4 py-2 text-sm font-bold shadow-sm">
                            <Sparkles className="w-4 h-4 text-secondary" />
                            <span>{message.text}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {isAdvancing && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="rounded-[24px] rounded-tl-md bg-white border border-secondary/15 shadow-sm px-4 py-3">
                    <div className="flex items-center gap-2 text-secondary">
                      <span className="w-2 h-2 rounded-full bg-secondary animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-secondary/70 animate-bounce [animation-delay:0.15s]" />
                      <span className="w-2 h-2 rounded-full bg-secondary/50 animate-bounce [animation-delay:0.3s]" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 bg-white/90 px-4 py-4 sm:px-6 sm:py-5">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-3 shadow-inner">
              <textarea
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={isRecording ? '正在听你说话...' : '在这里输入回答，或者点左边的话筒直接说出来'}
                className="w-full min-h-[92px] resize-none bg-transparent px-2 py-2 text-base leading-7 text-slate-800 placeholder:text-slate-400 focus:outline-none"
                disabled={isAdvancing}
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleRecording}
                    disabled={isAdvancing}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all border-4 shadow-[0_18px_40px_rgba(15,23,42,0.18)] ${
                      isRecording
                        ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-200 scale-105 animate-pulse'
                        : 'bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 border-white hover:scale-105'
                    } ${isAdvancing ? 'opacity-60 cursor-not-allowed' : ''}`}
                    title={isRecording ? '停止录音' : '开始录音'}
                  >
                    {isRecording ? <MicOff className="w-7 h-7 text-white" /> : <Mic className="w-7 h-7 text-white" />}
                  </button>

                  <div className="text-sm">
                    <p className="font-bold text-slate-700">{isRecording ? '录音中...' : '可以打字，也可以录音'}</p>
                    <p className="text-slate-400">{isRecording ? '说完后再点一次话筒' : '输入好以后点发送就会进入下一题'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleSkip}
                    disabled={isAdvancing}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-white text-slate-600 border border-slate-200 font-bold shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>{isLastQuestion ? '跳过并继续' : '跳过这题'}</span>
                  </button>

                  <button
                    onClick={handleSend}
                    disabled={!canSend}
                    className={`inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold transition-all ${
                      canSend
                        ? 'bg-gradient-to-r from-secondary-500 via-secondary-600 to-primary-500 text-white shadow-lg hover:scale-[1.02]'
                        : 'bg-slate-200 text-slate-400 shadow-sm cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>{isLastQuestion ? '发送并进入下一步' : '发送回答'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
