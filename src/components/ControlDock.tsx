import React, { useState } from 'react';
import { AppState, FacadeTheme, FloorFinish, LedCoveColor, RoomZone, SeasonType, WeatherType } from '../types';
import { ESTATE_ROOMS } from '../data/estateRooms';
import {
  Sun,
  CloudRain,
  Cloud,
  Moon,
  Flower2,
  TreeDeciduous,
  Leaf,
  Snowflake,
  Lightbulb,
  Sparkles,
  Flame,
  ChevronDown,
  ChevronUp,
  Sliders,
  Paintbrush
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface ControlDockProps {
  appState: AppState;
  onSelectRoom: (room: RoomZone) => void;
  onSetWeather: (weather: WeatherType) => void;
  onSetSeason: (season: SeasonType) => void;
  onSetTimeOfDay: (time: number) => void;
  onSetFloorFinish: (floor: FloorFinish) => void;
  onSetFacadeTheme: (theme: FacadeTheme) => void;
  onSetLedCoveColor: (color: LedCoveColor) => void;
  onToggleInteriorLights: () => void;
  onToggleSconceLights: () => void;
  onTogglePoolLights: () => void;
}

type DockTab = 'rooms' | 'finishes' | 'lighting' | 'weather';

export const ControlDock: React.FC<ControlDockProps> = ({
  appState,
  onSelectRoom,
  onSetWeather,
  onSetSeason,
  onSetTimeOfDay,
  onSetFloorFinish,
  onSetFacadeTheme,
  onSetLedCoveColor,
  onToggleInteriorLights,
  onToggleSconceLights,
  onTogglePoolLights
}) => {
  const [activeTab, setActiveTab] = useState<DockTab>('rooms');
  const [collapsed, setCollapsed] = useState(false);

  // Format time of day
  const hrs = Math.floor(appState.timeOfDay);
  const mins = Math.floor((appState.timeOfDay % 1) * 60);
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  const dispH = hrs % 12 === 0 ? 12 : hrs % 12;
  const formattedTime = `${dispH}:${mins.toString().padStart(2, '0')} ${ampm}`;

  return (
    <section className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 w-[96vw] max-w-5xl z-20 flex flex-col items-center">
      {/* Zen Mode Collapse / Expand Button */}
      <button
        type="button"
        onClick={() => {
          soundFx.playClick();
          setCollapsed(!collapsed);
        }}
        className="flex items-center gap-1.5 px-3 py-1 bg-[#0a0d14]/95 hover:bg-slate-900 text-slate-300 hover:text-white border border-white/10 border-b-0 rounded-t-xl text-xs font-semibold shadow-lg transition"
      >
        {collapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
            <span>Show Studio Controls</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
            <span>Hide Controls (Zen View)</span>
          </>
        )}
      </button>

      {/* Main Dock Container */}
      {!collapsed && (
        <div className="w-full bg-[#0a0d14]/98 border border-white/10 rounded-2xl shadow-2xl p-3 sm:p-4 text-slate-100">
          {/* Dock Tabs Header */}
          <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-2.5 mb-3 gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setActiveTab('rooms');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'rooms'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                🧭 Room Teleport ({ESTATE_ROOMS.length} Zones)
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setActiveTab('finishes');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'finishes'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Paintbrush className="w-3.5 h-3.5 text-amber-400" />
                <span>Dark Luxury Finishes & Facades</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setActiveTab('lighting');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'lighting'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>LED Cove & Lighting</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setActiveTab('weather');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'weather'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Atmosphere & Sun Arc</span>
              </button>
            </div>

            {/* Static Status Indicator */}
            <div className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
              {appState.weather.toUpperCase()} • {appState.season.toUpperCase()} • {formattedTime}
            </div>
          </div>

          {/* TAB 1: ROOM TELEPORT */}
          {activeTab === 'rooms' && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {ESTATE_ROOMS.map((room) => {
                const isActive = appState.activeRoomId === room.id;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => {
                      soundFx.playClick(1000);
                      onSelectRoom(room);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/30 font-bold'
                        : 'bg-[#121620] hover:bg-[#1a202c] text-slate-200 border-white/5'
                    }`}
                  >
                    <span>{room.icon}</span>
                    <span>{room.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 2: DARK LUXURY FINISHES & FACADES */}
          {activeTab === 'finishes' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Dark Luxury Flooring */}
                <div className="bg-[#0e121a] p-3 rounded-xl border border-white/5">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Interior Flooring Spec (Darker Hues)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        onSetFloorFinish('nero-marquina');
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold border transition text-center ${
                        appState.floorFinish === 'nero-marquina'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      Nero Marquina
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        onSetFloorFinish('smoked-oak');
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold border transition text-center ${
                        appState.floorFinish === 'smoked-oak'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      Smoked Oak
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        onSetFloorFinish('charcoal-basalt');
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold border transition text-center ${
                        appState.floorFinish === 'charcoal-basalt'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      Charcoal Basalt
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        onSetFloorFinish('travertine');
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold border transition text-center ${
                        appState.floorFinish === 'travertine'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      Greige Travertine
                    </button>
                  </div>
                </div>

                {/* Exterior Facade / Wall Palette */}
                <div className="bg-[#0e121a] p-3 rounded-xl border border-white/5">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Exterior Facade & Wall Material
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        onSetFacadeTheme('obsidian-bronze');
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold border transition text-center ${
                        appState.facadeTheme === 'obsidian-bronze'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      Obsidian & Bronze
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        onSetFacadeTheme('dark-charcoal');
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold border transition text-center ${
                        appState.facadeTheme === 'dark-charcoal'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      Dark Charcoal Slate
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        onSetFacadeTheme('warm-limestone');
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold border transition text-center ${
                        appState.facadeTheme === 'warm-limestone'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      Limestone Greige
                    </button>
                  </div>
                </div>
              </div>

              {/* 4K Seamless Furniture Textures Swatches */}
              <div className="bg-[#0e121a] p-3 rounded-xl border border-white/5">
                <span className="block text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2">
                  Seamless 4K Furniture Texture Swatches (Applied in 3D Scene)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="flex items-center gap-2.5 p-2 bg-[#080b12] rounded-xl border border-white/10">
                    <img
                      src="/src/assets/images/furniture_leather_1792149608555.jpg"
                      alt="Italian Charcoal Leather"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-cover border border-white/15 shrink-0"
                    />
                    <div className="overflow-hidden">
                      <strong className="block text-xs text-white truncate">Italian Leather</strong>
                      <span className="block text-[10px] text-slate-400 truncate">Executive Chairs & Daybeds</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 bg-[#080b12] rounded-xl border border-white/10">
                    <img
                      src="/src/assets/images/furniture_boucle_1792149609491.jpg"
                      alt="Ivory Textured Bouclé"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-cover border border-white/15 shrink-0"
                    />
                    <div className="overflow-hidden">
                      <strong className="block text-xs text-white truncate">Ivory Bouclé</strong>
                      <span className="block text-[10px] text-slate-400 truncate">Living Sectional & Beds</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 bg-[#080b12] rounded-xl border border-white/10">
                    <img
                      src="/src/assets/images/furniture_walnut_1792149622287.jpg"
                      alt="Smoked Espresso Walnut"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-cover border border-white/15 shrink-0"
                    />
                    <div className="overflow-hidden">
                      <strong className="block text-xs text-white truncate">Espresso Walnut</strong>
                      <span className="block text-[10px] text-slate-400 truncate">10-Seat Dining & Desks</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 bg-[#080b12] rounded-xl border border-white/10">
                    <img
                      src="/src/assets/images/furniture_velvet_1792149610250.jpg"
                      alt="Midnight Charcoal Velvet"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-cover border border-white/15 shrink-0"
                    />
                    <div className="overflow-hidden">
                      <strong className="block text-xs text-white truncate">Midnight Velvet</strong>
                      <span className="block text-[10px] text-slate-400 truncate">Cinema Tiered Recliners</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LED COVE LIGHTING & TEMPERATURE */}
          {activeTab === 'lighting' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* LED Cove Color Temperature */}
              <div className="bg-[#0e121a] p-3 rounded-xl border border-white/5">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Architectural LED Cove Color Temperature
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onSetLedCoveColor('warm-amber');
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border transition text-center ${
                      appState.ledCoveColor === 'warm-amber'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    Warm Amber (2700K)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onSetLedCoveColor('golden-champagne');
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border transition text-center ${
                      appState.ledCoveColor === 'golden-champagne'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    Champagne (3000K)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onSetLedCoveColor('crisp-white');
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border transition text-center ${
                      appState.ledCoveColor === 'crisp-white'
                        ? 'bg-slate-200/20 text-white border-white/40'
                        : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    Crisp Arch (4000K)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onSetLedCoveColor('midnight-cyan');
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border transition text-center ${
                      appState.ledCoveColor === 'midnight-cyan'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    Midnight Cyan
                  </button>
                </div>
              </div>

              {/* Lighting Zones */}
              <div className="bg-[#0e121a] p-3 rounded-xl border border-white/5">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Lighting Zones Switchboard
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onToggleInteriorLights();
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold border transition ${
                      appState.interiorLights
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>Interior: {appState.interiorLights ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onToggleSconceLights();
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold border transition ${
                      appState.sconceLights
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sconces: {appState.sconceLights ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onTogglePoolLights();
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold border transition ${
                      appState.poolLights
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span>Pool & Fire: {appState.poolLights ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ATMOSPHERE, SEASONS & TIME */}
          {activeTab === 'weather' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Atmospheric Weather */}
              <div className="bg-[#0e121a] p-2.5 rounded-xl border border-white/5">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Atmospheric Mode
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onSetWeather('noir');
                    }}
                    className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-medium border transition ${
                      appState.weather === 'noir'
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Moon className="w-3 h-3 text-indigo-400" />
                    <span>Noir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onSetWeather('sunny');
                    }}
                    className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-medium border transition ${
                      appState.weather === 'sunny'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Sun className="w-3 h-3 text-amber-400" />
                    <span>Sunny</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onSetWeather('rainy');
                    }}
                    className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-medium border transition ${
                      appState.weather === 'rainy'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <CloudRain className="w-3 h-3 text-blue-400" />
                    <span>Rainy</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onSetWeather('overcast');
                    }}
                    className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-medium border transition ${
                      appState.weather === 'overcast'
                        ? 'bg-slate-500/20 text-slate-200 border-slate-500/40'
                        : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Cloud className="w-3 h-3 text-slate-400" />
                    <span>Overcast</span>
                  </button>
                </div>
              </div>

              {/* Seasonal Landscape */}
              <div className="bg-[#0e121a] p-2.5 rounded-xl border border-white/5">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Seasonal Landscape
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onSetSeason('spring');
                    }}
                    className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-medium border transition ${
                      appState.season === 'spring'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Flower2 className="w-3 h-3 text-emerald-400" />
                    <span>Spring</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onSetSeason('summer');
                    }}
                    className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-medium border transition ${
                      appState.season === 'summer'
                        ? 'bg-green-500/20 text-green-300 border-green-500/40'
                        : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <TreeDeciduous className="w-3 h-3 text-green-400" />
                    <span>Summer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onSetSeason('autumn');
                    }}
                    className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-medium border transition ${
                      appState.season === 'autumn'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Leaf className="w-3 h-3 text-amber-400" />
                    <span>Autumn</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onSetSeason('winter');
                    }}
                    className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-medium border transition ${
                      appState.season === 'winter'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Snowflake className="w-3 h-3 text-cyan-400" />
                    <span>Winter</span>
                  </button>
                </div>
              </div>

              {/* Sun Arc & Time of Day */}
              <div className="bg-[#0e121a] p-2.5 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Sun Arc & Twilight
                  </span>
                  <span className="text-xs font-bold text-amber-400">{formattedTime}</span>
                </div>
                <input
                  type="range"
                  min="5.5"
                  max="23.5"
                  step="0.25"
                  value={appState.timeOfDay}
                  onChange={(e) => onSetTimeOfDay(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 mb-2 cursor-pointer"
                />
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onSetTimeOfDay(7.0);
                    }}
                    className="py-1 px-1 bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 rounded border border-white/5"
                  >
                    Dawn
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onSetTimeOfDay(12.5);
                    }}
                    className="py-1 px-1 bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 rounded border border-white/5"
                  >
                    Noon
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onSetTimeOfDay(18.5);
                    }}
                    className="py-1 px-1 bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 rounded border border-white/5"
                  >
                    Sunset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onSetTimeOfDay(22.0);
                    }}
                    className="py-1 px-1 bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 rounded border border-white/5"
                  >
                    Starlight
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
