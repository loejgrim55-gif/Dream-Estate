/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { AppState, CameraMode, FacadeTheme, FloorFinish, LedCoveColor, RoomZone, SeasonType, WeatherType } from './types';
import { ESTATE_ROOMS } from './data/estateRooms';
import { Viewport3D } from './components/Viewport3D';
import { TopBar } from './components/TopBar';
import { RoomCard } from './components/RoomCard';
import { ControlDock } from './components/ControlDock';
import { FpsOverlay } from './components/FpsOverlay';
import { soundFx } from './utils/audio';

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    viewMode: 'orbit',
    weather: 'noir', // Default dark moody noir
    season: 'summer',
    timeOfDay: 21.0, // Starlight 9:00 PM with architectural lighting & sconces
    roofVisible: false,
    interiorLights: true,
    sconceLights: true,
    poolLights: true,
    floorFinish: 'nero-marquina', // Dark luxury Nero Marquina marble
    facadeTheme: 'obsidian-bronze', // Dark obsidian & bronze facade
    ledCoveColor: 'warm-amber',
    activeRoomId: 'overview',
    soundEnabled: true,
    cinematicTour: false
  });

  // Active room data
  const currentRoom = ESTATE_ROOMS.find((r) => r.id === appState.activeRoomId) || ESTATE_ROOMS[0];

  const handleSelectRoom = useCallback((room: RoomZone) => {
    soundFx.playClick(950);
    setAppState((prev) => ({
      ...prev,
      activeRoomId: room.id,
      viewMode: prev.viewMode === 'firstPerson' ? 'firstPerson' : 'orbit'
    }));
  }, []);

  const handleResetView = useCallback(() => {
    soundFx.playClick(880);
    setAppState((prev) => ({
      ...prev,
      activeRoomId: 'overview',
      viewMode: 'orbit'
    }));
  }, []);

  const handleSetViewMode = useCallback((mode: CameraMode) => {
    soundFx.playClick(920);
    setAppState((prev) => ({
      ...prev,
      viewMode: mode
    }));
  }, []);

  const handleToggleRoof = useCallback(() => {
    soundFx.playClick(1050);
    setAppState((prev) => ({
      ...prev,
      roofVisible: !prev.roofVisible
    }));
  }, []);

  const handleToggleSound = useCallback(() => {
    setAppState((prev) => {
      const nextSound = !prev.soundEnabled;
      soundFx.enabled = nextSound;
      return {
        ...prev,
        soundEnabled: nextSound
      };
    });
  }, []);

  const handleToggleCinematicTour = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      cinematicTour: !prev.cinematicTour
    }));
  }, []);

  const handleSelectMood = useCallback((weather: WeatherType, time: number) => {
    soundFx.playClick(1000);
    setAppState((prev) => ({
      ...prev,
      weather,
      timeOfDay: time
    }));
  }, []);

  const handleSetWeather = useCallback((weather: WeatherType) => {
    setAppState((prev) => ({ ...prev, weather }));
  }, []);

  const handleSetSeason = useCallback((season: SeasonType) => {
    setAppState((prev) => ({ ...prev, season }));
  }, []);

  const handleSetTimeOfDay = useCallback((time: number) => {
    setAppState((prev) => ({ ...prev, timeOfDay: time }));
  }, []);

  const handleSetFloorFinish = useCallback((floorFinish: FloorFinish) => {
    setAppState((prev) => ({ ...prev, floorFinish }));
  }, []);

  const handleSetFacadeTheme = useCallback((facadeTheme: FacadeTheme) => {
    setAppState((prev) => ({ ...prev, facadeTheme }));
  }, []);

  const handleSetLedCoveColor = useCallback((ledCoveColor: LedCoveColor) => {
    setAppState((prev) => ({ ...prev, ledCoveColor }));
  }, []);

  const handleToggleInteriorLights = useCallback(() => {
    setAppState((prev) => ({ ...prev, interiorLights: !prev.interiorLights }));
  }, []);

  const handleToggleSconceLights = useCallback(() => {
    setAppState((prev) => ({ ...prev, sconceLights: !prev.sconceLights }));
  }, []);

  const handleTogglePoolLights = useCallback(() => {
    setAppState((prev) => ({ ...prev, poolLights: !prev.poolLights }));
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.key === '1') handleSetViewMode('orbit');
      if (e.key === '2') handleSetViewMode('plan');
      if (e.key === '3') handleSetViewMode('firstPerson');
      if (e.key.toLowerCase() === 'r') handleToggleRoof();
      if (e.key.toLowerCase() === 't') handleToggleCinematicTour();
      if (e.key === 'Escape' && appState.viewMode === 'firstPerson') {
        handleSetViewMode('orbit');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSetViewMode, handleToggleRoof, handleToggleCinematicTour, appState.viewMode]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#04060a] font-sans">
      {/* 3D WebGL Viewport */}
      <Viewport3D appState={appState} onSelectRoom={handleSelectRoom} />

      {/* Top Header & Refined Controls */}
      <TopBar
        viewMode={appState.viewMode}
        roofVisible={appState.roofVisible}
        soundEnabled={appState.soundEnabled}
        cinematicTour={appState.cinematicTour}
        weather={appState.weather}
        onSetViewMode={handleSetViewMode}
        onToggleRoof={handleToggleRoof}
        onToggleSound={handleToggleSound}
        onToggleCinematicTour={handleToggleCinematicTour}
        onSelectMood={handleSelectMood}
      />

      {/* First-Person Walkthrough Instructions Banner */}
      <FpsOverlay
        viewMode={appState.viewMode}
        onExitWalkMode={() => handleSetViewMode('orbit')}
      />

      {/* Floating Room Info Inspector */}
      <RoomCard
        room={currentRoom}
        onResetView={handleResetView}
        onEnterWalkMode={() => handleSetViewMode('firstPerson')}
        viewMode={appState.viewMode}
      />

      {/* Collapsible Unified Studio Control Dock */}
      <ControlDock
        appState={appState}
        onSelectRoom={handleSelectRoom}
        onSetWeather={handleSetWeather}
        onSetSeason={handleSetSeason}
        onSetTimeOfDay={handleSetTimeOfDay}
        onSetFloorFinish={handleSetFloorFinish}
        onSetFacadeTheme={handleSetFacadeTheme}
        onSetLedCoveColor={handleSetLedCoveColor}
        onToggleInteriorLights={handleToggleInteriorLights}
        onToggleSconceLights={handleToggleSconceLights}
        onTogglePoolLights={handleTogglePoolLights}
      />
    </main>
  );
}
