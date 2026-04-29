import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BookOpen, Image as ImageIcon, Download, Volume2 } from 'lucide-react';
import type { AppStep, StoryData } from './types';
import Step1TreasureHunt from './Step1TreasureHunt';
import Step2AIReporter from './Step2AIReporter';
import Step3MyMasterpiece from './Step3MyMasterpiece';
import Step4StoryMagician from './Step4StoryMagician';
import { generateStoryImage } from './services/ai';
import { STORIES } from './constants';
import { downloadImage } from './lib/download';
import { getTtsMode, preloadTts, setTtsMode, type TTSMode } from './lib/tts';

type Props = {
  onComplete: (correct: number, total: number) => void;
};

export function StoryDreamMachine({ onComplete }: Props) {
  const [step, setStep] = useState<AppStep | 'landing'>('landing');
  const [currentStory, setCurrentStory] = useState<StoryData>(STORIES[0]);
  const [transcript, setTranscript] = useState('');
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string | null>(null);
  const [step2Answers, setStep2Answers] = useState<Record<string, string>>({});
  const [storyImage, setStoryImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showFallbackNotice, setShowFallbackNotice] = useState(false);
  const [imagePool, setImagePool] = useState<Record<string, string>>({});
  const [ttsMode, setUiTtsMode] = useState<TTSMode>('server');

  useEffect(() => {
    const cached = localStorage.getItem('story_image_pool');
    if (!cached) return;

    try {
      setImagePool(JSON.parse(cached));
    } catch (error) {
      console.error('Failed to parse image pool', error);
    }
  }, []);

  useEffect(() => {
    setUiTtsMode(getTtsMode());
  }, []);

  const toggleTtsMode = () => {
    const nextMode: TTSMode = ttsMode === 'server' ? 'browser' : 'server';
    setTtsMode(nextMode);
    setUiTtsMode(nextMode);
  };

  const resetToLanding = () => {
    setStep('landing');
    setTranscript('');
    setOriginalAudioUrl(null);
    setStep2Answers({});
    setStoryImage(null);
    setIsGeneratingImage(false);
    setShowFallbackNotice(false);
  };

  const handleStart = async (selectedStory?: StoryData) => {
    const nextStory = selectedStory ?? STORIES[Math.floor(Math.random() * STORIES.length)];

    setCurrentStory(nextStory);
    setTranscript('');
    setStep2Answers({});
    setOriginalAudioUrl(null);
    setStep('treasure-hunt');
    setShowFallbackNotice(false);
    nextStory.questions.forEach((question) => preloadTts(question.question));

    if (nextStory.disableAI) {
      setIsGeneratingImage(false);
      setStoryImage(nextStory.imageUrl);
      return;
    }

    if (imagePool[nextStory.id]) {
      setIsGeneratingImage(false);
      setStoryImage(imagePool[nextStory.id]);
      return;
    }

    setIsGeneratingImage(true);
    const uniquePrompt = `${nextStory.imagePrompt} (Style: vibrant children's book illustration, unique version: ${Date.now()})`;
    const generated = await generateStoryImage(uniquePrompt);

    if (!generated) {
      setShowFallbackNotice(true);
      window.setTimeout(() => setShowFallbackNotice(false), 5000);
    }

    const finalImage = generated || nextStory.imageUrl;
    setStoryImage(finalImage);
    setIsGeneratingImage(false);

    if (!generated) return;

    const newPool = { ...imagePool, [nextStory.id]: generated };
    setImagePool(newPool);
    try {
      localStorage.setItem('story_image_pool', JSON.stringify(newPool));
    } catch (error) {
      console.warn('Storage limit reached', error);
    }
  };

  return (
    <div className="h-full min-h-[600px] flex flex-col bg-green-50 rounded-3xl shadow-xl relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <header className="p-6 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">故事造梦机</h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTtsMode}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white/80 text-xs text-slate-700 shadow-sm hover:bg-white transition-colors"
            title="切换配音模式"
          >
            <Volume2 className="w-4 h-4 text-primary" />
            <span>配音：{ttsMode === 'server' ? 'edge-tts' : '浏览器'}</span>
          </button>

          {step !== 'landing' && (
            <div className="flex gap-2">
              {['treasure-hunt', 'ai-reporter', 'my-masterpiece', 'story-magician'].map((item, index) => (
                <div
                  key={item}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    ['treasure-hunt', 'ai-reporter', 'my-masterpiece', 'story-magician'].indexOf(step) >= index
                      ? 'bg-primary'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col z-10 relative">
        <AnimatePresence>
          {showFallbackNotice && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className="absolute top-4 left-1/2 z-50 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              由于魔法能量暂时不足，已为你加载经典故事插图。
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-8"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="text-9xl mb-4"
                >
                  🎨
                </motion.div>
                <div className="absolute -top-4 -right-4 bg-accent p-3 rounded-full shadow-lg">
                  <Sparkles className="w-6 h-6 text-slate-800" />
                </div>
              </div>

              <div className="space-y-4 max-w-lg">
                <h2 className="text-5xl font-black text-slate-800 leading-tight">
                  让你的故事
                  <br />
                  <span className="text-primary">闪闪发光</span>
                </h2>
                <p className="text-lg text-slate-500">
                  通过“寻宝、采访、讲故事”三个有趣的关卡，
                  <br />
                  AI 魔法师会帮你把故事变得更精彩！
                </p>
              </div>

              <button
                onClick={() => void handleStart()}
                className="btn-kid-primary text-xl px-12 py-4 flex items-center gap-3"
              >
                <BookOpen className="w-6 h-6" />
                开始造梦
              </button>

              {Object.keys(imagePool).length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full max-w-2xl mt-8"
                >
                  <h3 className="text-lg font-bold text-slate-600 mb-4 flex items-center justify-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    我的梦境收藏
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(imagePool).map(([id, url]) => {
                      const story = STORIES.find((item) => item.id === id);
                      if (!story) return null;

                      return (
                        <div
                          key={id}
                          onClick={() => void handleStart(story)}
                          className="group relative aspect-square rounded-2xl overflow-hidden border-4 border-white shadow-md cursor-pointer hover:border-primary transition-all"
                        >
                          <img
                            src={url}
                            alt={story.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                            <span className="text-white text-xs font-bold">{story.title}</span>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                void downloadImage(url, `dream-${id}.jpg`);
                              }}
                              className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                              title="下载图片"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 'treasure-hunt' && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="flex-1"
            >
              <Step1TreasureHunt
                onComplete={() => setStep('ai-reporter')}
                imageUrl={storyImage || currentStory.imageUrl}
                isGenerating={isGeneratingImage}
                story={currentStory}
              />
            </motion.div>
          )}

          {step === 'ai-reporter' && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="flex-1"
            >
              <Step2AIReporter
                story={currentStory}
                onComplete={(answers) => {
                  setStep2Answers(answers);
                  setStep('my-masterpiece');
                }}
              />
            </motion.div>
          )}

          {step === 'my-masterpiece' && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="flex-1"
            >
              <Step3MyMasterpiece
                onComplete={(fullTranscript, audioUrl) => {
                  setTranscript(fullTranscript);
                  setOriginalAudioUrl(audioUrl);
                  setStep('story-magician');
                }}
                imageUrl={storyImage || currentStory.imageUrl}
                previousAnswers={step2Answers}
                story={currentStory}
              />
            </motion.div>
          )}

          {step === 'story-magician' && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="flex-1"
            >
              <Step4StoryMagician
                transcript={transcript}
                originalAudioUrl={originalAudioUrl}
                imageUrl={storyImage || currentStory.imageUrl}
                onRestart={resetToLanding}
                onFinishLesson={() => onComplete(1, 1)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="p-4 text-center text-slate-400 text-xs flex flex-col gap-1">
        <p>© 2026 故事造梦机 - 专为一年级孩子设计的看图说话神器</p>
        <p className="opacity-50">v1.2.0 - 已加载 {STORIES.length} 个故事场景</p>
      </footer>
    </div>
  );
}
