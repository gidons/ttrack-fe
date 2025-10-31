export interface Song {
  id: string;
  title: string;
  arranger?: string;
  key?: string;
  durationSec?: number;
}

export interface StereoMixSpec {
  leftFactors: number[];
  rightFactors: number[];
}

export interface StereoMix {
  name: string;
  parts: string[];
  spec: StereoMixSpec;
}

export const NULL_STEREO_MIX: StereoMix = {
  name: "N/A",
  parts: [],
  spec: { leftFactors: [], rightFactors: [] }
}

export interface TrackInfo {
  readonly trackId: string;
  readonly songId: string;
  readonly durationSec: number;
  readonly created: Date;
  readonly updated: Date;
  readonly url: string;
  readonly mediaUrl: string;
}

export interface PartTrack extends TrackInfo {
  readonly part: string;
}

export interface MixTrack extends TrackInfo {
  readonly mix: StereoMix;
}

export type Track = PartTrack | MixTrack;

export function isMixTrack(t: Track): t is MixTrack { return t != null && t['mix']; }
export function isPartTrack(t: Track): t is PartTrack { return t != null && t['part']; }

export function trackName(t: Track): string {
  return isMixTrack(t) ? t.trackId : t.part;
}

export function stereoMix(t: Track): StereoMix {
  if (isMixTrack(t)) {
    return t.mix;
  }
  if (isPartTrack(t)) {
    return {
      name: t.part,
      parts: [t.part],
      spec: {
        leftFactors: [1.0],
        rightFactors: [1.0]
      }
    }
  }
  return { name: "", parts: [], spec: { leftFactors: [], rightFactors: [] } };
}

export function secondsToHMS(seconds: number): string {
  if (seconds <= 0) { return '--'; }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const hDisplay = h > 0 ? h + ":" : "";
  const mDisplay = m > 0 ? m + ":" : "";
  const sDisplay = s.toString().padStart(2, '0');
  return (hDisplay + mDisplay + sDisplay).trim();
}

