import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Volume2, X, Download } from 'lucide-react';
import { Hotspot, StoryData } from './types';
import { downloadImage } from './lib/download';
import { speak, preloadTts } from './lib/tts';

interface Props {
  onComplete: (foundHotspots: string[]) => void;
  imageUrl: string;
  isGenerating: boolean;
  story: StoryData;
}

export default function Step1TreasureHunt({ onComplete, imageUrl, isGenerating, story }: Props) {
  const [foundIds, setFoundIds] = useState<string[]>([]);
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);

  useEffect(() => {
    story.hotspots.forEach((h) => preloadTts(h.audioText));
  }, [story]);

  const handleHotspotClick = (hotspot: Hotspot) => {
    setActiveHotspot(hotspot);
    if (!foundIds.includes(hotspot.id)) {
      setFoundIds([...foundIds, hotspot.id]);
    }
    
    void speak(hotspot.audioText);
  };

  const isAllFound = foundIds.length === story.hotspots.length;

  return (
    <div className="flex flex-col items-center gap-6 p-4 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
          <Search className="w-8 h-8" /> 第一步：图画寻宝 —— {story.title}
        </h2>
        <p className="text-slate-500">小朋友，图里藏着好多小秘密，快把它们找出来吧！({foundIds.length}/{story.hotspots.length})</p>
      </div>

      <div className="relative w-full aspect-[3/2] rounded-3xl overflow-hidden shadow-2xl border-8 border-white bg-slate-100">
        {!isGenerating && (
          <button
            onClick={() => downloadImage(imageUrl, `${story.title}.jpg`)}
            className="absolute top-4 right-4 z-20 p-3 bg-white/80 hover:bg-white rounded-full shadow-lg text-primary transition-all hover:scale-110"
            title="下载这张画"
          >
            <Download className="w-6 h-6" />
          </button>
        )}
        
        {isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="text-4xl"
            >
              🎨
            </motion.div>
            <p className="text-slate-500 font-medium animate-pulse">魔法师正在为你绘图...</p>
          </div>
        ) : (
          <>
            <motion.img
              src={imageUrl}
              alt={story.title}
              className="w-full h-full object-cover"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              referrerPolicy="no-referrer"
            />

            {story.hotspots.map((hotspot) => (
              <div
                key={hotspot.id}
                className="hotspot-pulse"
                style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                onClick={() => handleHotspotClick(hotspot)}
              >
                <div className="w-3 h-3 bg-white rounded-full" />
              </div>
            ))}
          </>
        )}

        <AnimatePresence>
          {activeHotspot && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-4 right-4 glass-card p-6 flex items-center justify-between gap-4"
            >
              <div className="flex-1">
                <h3 className="text-xl font-bold text-primary mb-2">{activeHotspot.label}</h3>
                <div className="flex gap-2">
                  {activeHotspot.words.map((word) => (
                    <span key={word} className="bg-accent/30 px-3 py-1 rounded-full text-sm font-medium">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setActiveHotspot(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isAllFound && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => onComplete(foundIds)}
          className="btn-kid-primary mt-4"
        >
          寻宝完成！进入下一步
        </motion.button>
      )}
    </div>
  );
}
