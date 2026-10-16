import React from 'react';
import { CameraMode } from '../types';
import { X, Navigation } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface FpsOverlayProps {
  viewMode: CameraMode;
  onExitWalkMode: () => void;
}

export const FpsOverlay: React.FC<FpsOverlayProps> = ({ viewMode, onExitWalkMode }) => {
  if (viewMode !== 'firstPerson') return null;

  return (
    <div className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
      <div className="flex items-center gap-2 sm:gap-3 bg-slate-950/90 border border-amber-500/50 px-3.5 py-2 rounded-full shadow-2xl text-xs text-slate-100">
        <div className="flex items-center gap-1.5 text-amber-400 font-bold">
          <Navigation className="w-4 h-4 animate-bounce" />
          <span>Walkthrough Mode:</span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-slate-300">
          <span>Use</span>
          <kbd className="px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded font-mono font-bold text-[11px] border border-white/10">W</kbd>
          <kbd className="px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded font-mono font-bold text-[11px] border border-white/10">A</kbd>
          <kbd className="px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded font-mono font-bold text-[11px] border border-white/10">S</kbd>
          <kbd className="px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded font-mono font-bold text-[11px] border border-white/10">D</kbd>
          <span>or Arrows • Drag to look</span>
        </div>
        <button
          type="button"
          onClick={() => {
            soundFx.playClick();
            onExitWalkMode();
          }}
          className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-full font-bold text-xs transition"
        >
          <X className="w-3.5 h-3.5" />
          <span>Exit Walk</span>
        </button>
      </div>
    </div>
  );
};
