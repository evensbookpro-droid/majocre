import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LoaderProps {
  message?: string;
  subMessage?: string;
}

export default function Loader({ message, subMessage }: LoaderProps) {
  const { t } = useLanguage();
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  
  const loadingTexts = t('loader', 'texts') as string[];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % loadingTexts.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [loadingTexts.length]);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
      <div className="relative">
        {/* Outer Glow Ring */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 rounded-full border-2 border-brand/10 border-t-brand shadow-[0_0_20px_rgba(var(--brand-rgb),0.2)]"
        />
        
        {/* Inner Spinner */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ShieldCheck className="w-8 h-8 text-brand/40" />
          </motion.div>
        </div>

        {/* Orbiting particles (decor) */}
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-brand rounded-full shadow-[0_0_10px_rgba(var(--brand-rgb),0.8)]" />
        </motion.div>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentTextIndex}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-lg font-bold text-white tracking-tight"
          >
            {message || loadingTexts[currentTextIndex]}
          </motion.p>
        </AnimatePresence>
        
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] animate-pulse">
          {subMessage || t('loader', 'subMessage')}
        </p>
      </div>

      <div className="flex items-center gap-2 px-3 py-1 bg-brand/5 border border-brand/20 rounded-full">
         <Lock size={10} className="text-brand" />
         <span className="text-[8px] font-bold text-brand uppercase tracking-widest font-mono">End-to-End Encrypted</span>
      </div>
    </div>
  );
}
