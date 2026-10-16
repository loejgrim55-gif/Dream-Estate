import React from 'react';
import { CameraMode, WeatherType } from '../types';
import { Volume2, VolumeX, Layers, Compass, Eye, Footprints, Play, Pause, Sparkles } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface TopBarProps {
  viewMode: CameraMode;
  roofVisible: boolean;
  soundEnabled: boolean;
  cinematicTour: boolean;
  weather: WeatherType;
  onSetViewMode: (mode: CameraMode) => void;
  onToggleRoof: () => void;
  onToggleSound: () => void;
  onToggleCinematicTour: () => void;
  onSelectMood: (weather: WeatherType, time: number) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  viewMode,
  roofVisible,
  soundEnabled,
  cinematicTour,
  onSetViewMode,
  onToggleRoof,
  onToggleSound,
  onToggleCinematicTour,
  onSelectMood
}) => {
  return (
    <header className="fixed top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 max-w-7xl mx-auto p-2.5 sm:p-3 bg-[#0a0d14]/92 border border-white/10 rounded-2xl shadow-2xl z-30 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
      {/* Brand & Estate Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-500/20 text-sm">
          DE
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-slate-100">
              Dream Estate 3D Sanctuary
            </h1>
            <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-300 rounded border border-amber-500/25">
              5+ ACRES • LUXURY
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            6 Beds • 5 Baths • 3 Garages • <em>"Home, Faith, Family, Forever ♡"</em>
          </p>
        </div>
      </div>

      {/* Camera Modes & Roof Cutaway Controls */}
      <nav className="flex items-center gap-1 sm:gap-1.5 bg-[#05070a]/90 p-1 rounded-xl border border-white/10" aria-label="Camera View Modes">
        <button
          type="button"
          onClick={() => {
            soundFx.playClick();
            onSetViewMode('orbit');
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            viewMode === 'orbit'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Dollhouse Orbit</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playClick();
            onSetViewMode('plan');
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            viewMode === 'plan'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Blueprint</span> Plan
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playClick();
            onSetViewMode('firstPerson');
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            viewMode === 'firstPerson'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Footprints className="w-3.5 h-3.5" />
          <span>Walk</span>
        </button>

        <span className="w-px h-4 bg-white/20 mx-0.5" />

        <button
          type="button"
          onClick={() => {
            soundFx.playClick();
            onToggleRoof();
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            roofVisible
              ? 'bg-emerald-700 text-white'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
          title="Toggle between cutaway open floorplan and full roof"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{roofVisible ? 'Roof: ON' : 'Cutaway'}</span>
        </button>
      </nav>

      {/* Action Zone: Cinematic Tour, Dark Mood Presets & Audio */}
      <div className="flex items-center gap-2">
        {/* Quick Dark Mood Presets */}
        <div className="hidden lg:flex items-center gap-1 bg-[#05070a]/90 p-1 rounded-xl border border-white/10 text-[11px]">
          <span className="text-slate-400 pl-1.5 pr-0.5 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Mood:
          </span>
          <button
            type="button"
            onClick={() => onSelectMood('noir', 22.0)}
            className="px-2 py-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition"
            title="Moody Noir Midnight with dramatic contrast"
          >
            Noir
          </button>
          <button
            type="button"
            onClick={() => onSelectMood('sunny', 18.5)}
            className="px-2 py-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition"
            title="Golden Sunset Golden Hour"
          >
            Sunset
          </button>
          <button
            type="button"
            onClick={() => onSelectMood('rainy', 15.0)}
            className="px-2 py-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition"
            title="Atmospheric Rainy Dusk"
          >
            Rain
          </button>
        </div>

        {/* Cinematic Auto-Tour Toggle */}
        <button
          type="button"
          onClick={() => {
            soundFx.playClick();
            onToggleCinematicTour();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
            cinematicTour
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
              : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
          title="Toggle smooth cinematic auto-orbit tour"
        >
          {cinematicTour ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-amber-400" />}
          <span>{cinematicTour ? 'Tour: ON' : 'Cinematic Tour'}</span>
        </button>

        {/* Audio Toggle */}
        <button
          type="button"
          onClick={() => {
            soundFx.playClick();
            onToggleSound();
          }}
          className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 rounded-xl transition"
          title={soundEnabled ? 'Mute procedural audio' : 'Unmute procedural audio'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>
      </div>
    </header>
  );
};
