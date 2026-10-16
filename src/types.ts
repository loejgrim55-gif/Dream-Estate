export type CameraMode = 'orbit' | 'plan' | 'firstPerson';
export type WeatherType = 'sunny' | 'rainy' | 'overcast' | 'noir';
export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';
export type FloorFinish = 'nero-marquina' | 'smoked-oak' | 'charcoal-basalt' | 'travertine';
export type FacadeTheme = 'obsidian-bronze' | 'dark-charcoal' | 'warm-limestone';
export type LedCoveColor = 'warm-amber' | 'golden-champagne' | 'crisp-white' | 'midnight-cyan';

export interface RoomZone {
  id: string;
  name: string;
  badge: string;
  icon: string;
  center: [number, number, number];
  radius: number;
  phi: number;
  theta: number;
  sqft?: string;
  desc: string;
  features: string[];
}

export interface AppState {
  viewMode: CameraMode;
  weather: WeatherType;
  season: SeasonType;
  timeOfDay: number; // 5.5 to 23.5
  roofVisible: boolean;
  interiorLights: boolean;
  sconceLights: boolean;
  poolLights: boolean;
  floorFinish: FloorFinish;
  facadeTheme: FacadeTheme;
  ledCoveColor: LedCoveColor;
  activeRoomId: string;
  soundEnabled: boolean;
  cinematicTour: boolean;
}
