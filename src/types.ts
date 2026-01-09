export interface Song {
  id: string;
  title: string;
  shortTitle?: string;
  arranger?: string;
  key?: string;
  voicing?: string;
  durationSec?: number;
  allPartsMediaUrl?: string;
  eTag?: string;
}

export function isCreatableSong(partialSong: Partial<Song>) {
  return !!partialSong.title
}

export interface StereoMixSpec {
  leftFactors: number[];
  rightFactors: number[];
}

export interface StereoMix {
  name: string;
  parts: string[];
  spec: StereoMixSpec;
  pitchShift: number;
  speedFactor: number;
}

export const NULL_STEREO_MIX: StereoMix = {
  name: "N/A",
  parts: [],
  spec: { leftFactors: [], rightFactors: [] },
  pitchShift: 0,
  speedFactor: 1
}

export interface Voicing {
  name: string;
  displayName: string;
  parts: string[];
}

export const STD_VOICING_LIST: Array<Voicing> = [
  { name: "BB", displayName: "TLBB", parts: ["Tenor", "Lead", "Bari", "Bass"] },
  { name: "TTBB", displayName: "TTBB", parts: ["Tenor1", "Tenor2", "Bari", "Bass"] },
  { name: "SSAA", displayName: "SSAA", parts: ["Tenor", "Lead", "Bari", "Bass"] },
  { name: "SATB", displayName: "SATB", parts: ["Soprano1", "Soprano2", "Alto1", "Alto2"] },
  { name: "SSAATTBB", displayName: "SSAATTBB", parts: ["Soprano1", "Soprano2", "Alto1", "Alto2", "Tenor1", "Tenor2", "Bari", "Bass"] },
  { name: "CUSTOM", displayName: "Custom", parts: [] }
]
export const STD_VOICINGS = Object.fromEntries(STD_VOICING_LIST.map(v => [v.name, v]))

export const STD_MIX_TYPES = ["Full Mix", "Solo", "Dominant", "Left", "Missing"]

export function fullMixForParts(name: string, parts: Array<string>): StereoMix {
  const n = parts.length
  return {
    name,
    parts,
    spec: { leftFactors: Array(n).fill(1/n), rightFactors: Array(n).fill(1/n) },
    pitchShift: 0,
    speedFactor: 1
  }
}

export interface TrackInfo {
  readonly trackId: string;
  readonly songId: string;
  readonly durationSec: number;
  readonly created: Date;
  readonly updated: Date;
  readonly currentTaskId: string;
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

export function isValidTrack(t: Partial<TrackInfo>): t is Track { return t != null && !!t['songId'] && !!t['trackId']; }
export function isValidMixTrack(t: Partial<MixTrack>): t is MixTrack { return isValidTrack(t) && isMixTrack(t) }
export function isValidPartTrack(t: Partial<PartTrack>): t is PartTrack { return isValidTrack(t) && isPartTrack(t) }

export function isTrackUpdating(t: TrackInfo): boolean {
  return !!t.currentTaskId
}

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
      },
      pitchShift: 0,
      speedFactor: 1
    }
  }
  return NULL_STEREO_MIX
}

export function secondsToHMS(seconds: number): string {
  if (seconds <= 0) { return '--'; }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const hDisplay = h > 0 ? h + ":" : "";
  const mDisplay = h > 0 ? 
    m.toString().padStart(2, '0') + ":" : 
    (m > 0 ? m + ":" : "");
  const sDisplay = s.toString().padStart(2, '0');
  return (hDisplay + mDisplay + sDisplay).trim();
}

