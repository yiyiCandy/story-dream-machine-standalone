import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, MessageCircle } from 'lucide-react';
import { StoryData } from './types';
import { cancelSpeaking, speak, preloadTts } from './lib/tts';

interface Props {
  story: StoryData;
  onComplete: (answers: Record<string, string>) => void;
}

const FEEDBACK_PHRASES = ["说得真好！", "我知道了！", "太棒了！", "你观察得真仔细！", "听起来很有趣！"];

export default function Step2AIReporter({ story, onComplete }: Props) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const recognitionStateRef = useRef<'idle' | 'starting' | 'listening' | 'stopping'>('idle');

  const currentQuestion = story.questions[currentQuestionIndex];

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
    };
  }, []);

  useEffect(() => {
    story.questions.forEach((q) => preloadTts(q.question));
    FEEDBACK_PHRASES.forEach((p) => preloadTts(p));
  }, [story]);

  useEffect(() => {
    const next = story.questions[currentQuestionIndex + 1];
    if (next) preloadTts(next.question);
  }, [currentQuestionIndex, story]);

  useEffect(() => {
    if (currentQuestion) {
      void speak(currentQuestion.question);
    }
  }, [currentQuestion]);

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

  const handleNext = () => {
    const newAnswers = { ...answers, [currentQuestion.key]: transcript };
    setAnswers(newAnswers);

    const randomFeedback = FEEDBACK_PHRASES[Math.floor(Math.random() * FEEDBACK_PHRASES.length)];
    setFeedback(randomFeedback);
    void speak(randomFeedback);

    setTimeout(() => {
      setFeedback(null);
      setTranscript('');

      if (currentQuestionIndex < story.questions.length - 1) {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        void speak(story.questions[nextIndex].question);
      } else {
        onComplete(newAnswers);
      }
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center gap-8 p-4 max-w-2xl mx-auto py-12">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-secondary flex items-center justify-center gap-2">
          <MessageCircle className="w-8 h-8" /> 第二步：AI 小记者采访
        </h2>
        <p className="text-slate-500">听听小猴子记者在问什么，按住麦克风回答吧！</p>
      </div>

      <div className="flex flex-col items-center gap-6 w-full">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-32 h-32 bg-secondary/20 rounded-full flex items-center justify-center border-4 border-secondary"
        >
          <span className="text-6xl">🐒</span>
        </motion.div>

        <div className="speech-bubble w-full max-w-md">
          <AnimatePresence mode="wait">
            {feedback ? (
              <motion.p
                key="feedback"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-xl font-bold text-secondary text-center py-2"
              >
                ✨ {feedback}
              </motion.p>
            ) : (
              <motion.div
                key="question"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p className="text-lg font-medium text-slate-700 text-center">
                  {currentQuestion.question}
                </p>
                <p className="text-xs text-slate-400 text-center mt-2 italic">提示：{currentQuestion.hint}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center gap-4 w-full">
          <div className="min-h-[60px] w-full bg-white/50 rounded-2xl p-4 text-center border-2 border-dashed border-slate-200">
            {transcript || (isRecording ? "正在听..." : "你的回答会出现在这里...")}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all border-4 shadow-[0_18px_40px_rgba(15,23,42,0.22)] ${
                isRecording
                  ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-200 scale-110 animate-pulse'
                  : 'bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 border-white hover:scale-105'
              }`}
            >
              {isRecording ? <MicOff className="w-10 h-10 text-white" /> : <Mic className="w-10 h-10 text-white drop-shadow-sm" />}
            </button>

            {isRecording && (
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => {
                    stopRecognition();
                    setTimeout(handleNext, 500);
                  }}
                className="bg-green-500 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-green-600 transition-colors"
              >
                说完了，下一题
              </motion.button>
            )}
          </div>

          {!isRecording && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleNext}
              className="btn-kid-secondary w-full max-w-xs"
            >
              {transcript ? "回答好了，下一题" : (currentQuestionIndex === story.questions.length - 1 ? "回答好了，进入下一步" : "跳过此题")}
            </motion.button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {story.questions.map((_, idx) => (
          <div
            key={idx}
            className={`w-3 h-3 rounded-full ${idx === currentQuestionIndex ? 'bg-secondary' : 'bg-slate-200'}`}
          />
        ))}
      </div>
    </div>
  );
}
