import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eraser, Mic, MicOff, Play, Layout, Wand2 } from 'lucide-react';
import { StoryData } from './types';
import { cancelSpeaking, speak, preloadTts } from './lib/tts';

interface Props {
  onComplete: (fullTranscript: string, audioUrl: string | null) => void;
  imageUrl: string;
  previousAnswers: Record<string, string>;
  story: StoryData;
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

  const mergeTranscript = (base: string, next: string) => {
    const cleanBase = base.trim();
    const cleanNext = next.trim();

    if (!cleanBase) return cleanNext;
    if (!cleanNext) return cleanBase;
    return `${cleanBase}${/[。！？.!?]$/.test(cleanBase) ? '' : '。'}${cleanNext}`;
  };

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
    preloadTts("魔法合体成功！你可以再检查一下有没有说错的地方哦。");
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
        stream.getTracks().forEach(track => track.stop());
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

  const handleMagicCombine = () => {
    const merged = Object.values(previousAnswers).filter(a => a && a !== "（跳过了）").join('。');
    if (merged) {
      setTranscript(merged + '。');
      void speak("魔法合体成功！你可以再检查一下有没有说错的地方哦。");
    }
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

  return (
    <div className="flex flex-col items-center gap-6 p-4 max-w-6xl mx-auto pb-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
          <Layout className="w-8 h-8" /> 第三步：我的大作
        </h2>
        <p className="text-slate-500">采访结束啦，现在请你像个小广播员一样，把整个故事连起来讲一遍吧！</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] gap-6 w-full items-start">
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden shadow-lg border-4 border-white">
            <img src={imageUrl} alt="Story" className="w-full h-auto" referrerPolicy="no-referrer" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)] gap-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Play className="w-4 h-4 text-primary" />
                <h4 className="font-bold text-primary">故事小记忆</h4>
              </div>
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {story.questions.map((q) => (
                  <div key={q.key} className="bg-white/70 p-3 rounded-2xl border border-primary/10">
                    <p className="text-xs text-slate-400 font-medium">{q.question}</p>
                    <p className="text-sm text-slate-700 font-bold mt-1">
                      {previousAnswers[q.key] || "（跳过了）"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-4">
              <h4 className="font-bold text-primary mb-3 flex items-center gap-2">
                <Layout className="w-4 h-4" /> 关键词提示
              </h4>
              <div className="flex flex-wrap gap-2">
                {story.hotspots.map((h) => (
                  <span key={h.id} className="bg-accent/30 px-3 py-1.5 rounded-full text-sm font-medium text-slate-700">
                    {h.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="xl:sticky xl:top-4">
          <div className="rounded-[32px] bg-white/95 border border-white shadow-[0_24px_60px_rgba(113,164,142,0.18)] p-5 sm:p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-[0.2em] text-primary/60 uppercase">Story Studio</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">故事录音台</h3>
                <p className="text-sm text-slate-500 mt-1">一边讲，一边看文字写下来，小朋友会更有安全感。</p>
              </div>
              <div className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold ${isRecording ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                {isRecording ? '● 正在录音' : '准备好了'}
              </div>
            </div>

            <div className="rounded-3xl bg-primary/5 border border-primary/10 p-4 flex items-center gap-4">
              <button
                onClick={toggleRecording}
                className={`shrink-0 w-20 h-20 rounded-full flex items-center justify-center shadow-[0_20px_45px_rgba(15,23,42,0.24)] transition-all border-4 ${
                  isRecording
                    ? 'bg-gradient-to-br from-red-500 to-red-700 border-red-200 animate-pulse scale-105'
                    : 'bg-gradient-to-br from-orange-500 via-amber-500 to-orange-700 border-white hover:scale-105'
                }`}
              >
                {isRecording ? <MicOff className="w-9 h-9 text-white" /> : <Mic className="w-9 h-9 text-white drop-shadow-sm" />}
              </button>
              <div className="min-w-0">
                <p className="font-bold text-slate-800">
                  {isRecording ? '正在把你的声音变成文字...' : '点这里开始讲故事'}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {isRecording ? '说到哪儿，文字就会出现到下方故事纸上。' : '录完再点一次麦克风结束，也可以直接在文本框里修改。'}
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border-2 border-slate-100 bg-slate-50/70 p-4 sm:p-5 relative">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-slate-700">我的故事纸</p>
                  <p className="text-xs text-slate-400">{transcriptLength > 0 ? `已经写下 ${transcriptLength} 个字` : '把看到的、想到的、发生的事都讲进去'}</p>
                </div>
                {isRecording && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    className="flex items-center gap-2 text-red-500 text-sm font-bold"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    REC
                  </motion.div>
                )}
              </div>

              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={isRecording ? "我正在听，你的话会马上出现在这里..." : "先说一说图上发生了什么，再讲讲你的想法吧！"}
                className="w-full min-h-[220px] sm:min-h-[260px] max-h-[320px] bg-white rounded-3xl border border-slate-200 resize-none p-5 text-lg text-slate-700 leading-relaxed outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleMagicCombine}
                className="min-h-touch rounded-2xl bg-amber-50 text-amber-700 font-bold px-4 py-3 flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors"
                title="把刚才采访时的回答先拼成一段"
              >
                <Wand2 className="w-4 h-4" /> 魔法合体
              </button>
              <button
                onClick={handleResetDraft}
                className="min-h-touch rounded-2xl bg-slate-100 text-slate-600 font-bold px-4 py-3 flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
              >
                <Eraser className="w-4 h-4" /> 清空重说
              </button>
            </div>

            {canSubmit && (
              <motion.button
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => onComplete(transcript, audioUrl)}
                className="btn-kid-primary w-full"
              >
                讲完啦，看看魔法师的评价
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
