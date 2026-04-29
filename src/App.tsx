import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, RefreshCw, Sparkles } from 'lucide-react';
import { StoryDreamMachine } from './StoryDreamMachine/StoryDreamMachine';

type StoryResult = {
  correct: number;
  total: number;
  stars: number;
};

function toStars(correct: number, total: number) {
  const pct = total > 0 ? correct / total : 0;
  if (pct >= 0.9) return 3;
  if (pct >= 0.7) return 2;
  if (pct >= 0.4) return 1;
  return 0;
}

export default function App() {
  const [sessionKey, setSessionKey] = useState(0);
  const [result, setResult] = useState<StoryResult | null>(null);

  if (result) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[32px] shadow-2xl p-8 sm:p-10 text-center border border-primary-100"
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-primary-100 flex items-center justify-center shadow-lg mb-6">
              <Sparkles className="w-10 h-10 text-primary-600" />
            </div>

            <h1 className="font-display text-kid-2xl text-primary-600 mb-3">故事讲完啦！</h1>
            <p className="text-kid-md text-slate-600 mb-6">这是一份独立版故事造梦机，你可以继续优化它，再同步回 Study Buddy。</p>

            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3].map((star) => (
                <span key={star} className={`text-5xl ${star <= result.stars ? '' : 'opacity-20'}`}>⭐</span>
              ))}
            </div>

            <p className="text-kid-md text-slate-700 mb-8">
              完成度 <span className="font-bold text-success">{result.correct}</span> / {result.total}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setResult(null);
                  setSessionKey((value) => value + 1);
                }}
                className="btn-kid-primary flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                再讲一个
              </button>
              <button
                onClick={() => setResult(null)}
                className="btn-kid-secondary flex items-center justify-center gap-2"
              >
                <BookOpen className="w-5 h-5" />
                回到首页
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <StoryDreamMachine
          key={sessionKey}
          onComplete={(correct, total) => {
            setResult({ correct, total, stars: toStars(correct, total) });
          }}
        />
      </div>
    </div>
  );
}
