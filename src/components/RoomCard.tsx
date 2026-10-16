import React, { useState } from 'react';
import { RoomZone, CameraMode } from '../types';
import { RotateCcw, Footprints, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface RoomCardProps {
  room: RoomZone;
  onResetView: () => void;
  onEnterWalkMode: () => void;
  viewMode: CameraMode;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  onResetView,
  onEnterWalkMode,
  viewMode
}) => {
  const [minimized, setMinimized] = useState(false);

  if (viewMode === 'firstPerson') {
    return null;
  }

  return (
    <aside className="fixed top-20 sm:top-24 left-3 sm:left-4 w-72 sm:w-80 bg-[#080b12]/95 border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="p-3 sm:p-3.5 border-b border-white/10 flex items-center justify-between gap-2 bg-[#04060a]/60">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md truncate">
            {room.badge}
          </span>
          {room.sqft && (
            <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 whitespace-nowrap">
              {room.sqft}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setMinimized(!minimized);
            }}
            className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded transition"
            title={minimized ? 'Expand room card' : 'Minimize room card'}
          >
            {minimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          {room.id !== 'overview' && (
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                onResetView();
              }}
              className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded transition"
              title="Reset view to full estate overview"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {!minimized && (
        <div className="p-3.5 sm:p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <span className="text-2xl select-none">{room.icon}</span>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white leading-tight">
                {room.name}
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {room.desc}
              </p>
            </div>
          </div>

          {/* Key Architectural Features */}
          {room.features && room.features.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {room.features.map((feat, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-300 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md"
                >
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  {feat}
                </span>
              ))}
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1 gap-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                onEnterWalkMode();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Walk into Room</span>
            </button>

            {room.id !== 'overview' && (
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  onResetView();
                }}
                className="py-1.5 px-2.5 text-slate-400 hover:text-white text-xs hover:bg-white/5 rounded-lg transition"
              >
                Reset View
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
