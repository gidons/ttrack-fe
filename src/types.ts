export interface Song {
  id: string;
  title: string;
  arranger?: string;
  key?: string;
  durationSec?: number;
}

export interface AudioMix {
  name: string;
}

export interface StereoMix extends AudioMix {
  leftFactors: number[];
  rightFactors: number[];
}

export interface TrackInfo {
  readonly trackId: string;
  readonly songId: string;
  readonly durationSec: number;
  readonly created: Date;
  readonly updated: Date;
  readonly url: URL;
  readonly mediaUrl: URL;
}

export interface PartTrack extends TrackInfo {
  readonly part: string;
}

export interface MixTrack extends TrackInfo {
  readonly mix: AudioMix;
  readonly parts: string[];
}

export type Track = PartTrack | MixTrack;

export function secondsToHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const hDisplay = h > 0 ? h + ":" : "";
  const mDisplay = m > 0 ? m + ":" : "";
  const sDisplay = s.toString().padStart(2, '0');
  return (hDisplay + mDisplay + sDisplay).trim();
}

