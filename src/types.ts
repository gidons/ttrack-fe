import { To } from "react-router";
import { pick } from "./components/utils";

export interface Song {
    id: string;
    title: string;
    shortTitle?: string;
    arranger?: string;
    key?: string;
    voicing?: string;
    durationSec?: number;
    parts: string[],
    /** The media URL for the all-channel mix */
    mediaUrl?: string;
    notationUrl?: string;
    eTag?: string;
}

export function isCreatableSong(partialSong: Partial<Song>) {
    return !!partialSong.title
}

export interface StereoMixSpec {
    leftFactors: number[];
    rightFactors: number[];
}

// TODO add maxGain/maxLevel, to support totals above 1.0?
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
    { name: "SATB", displayName: "SATB", parts: ["Soprano", "Alto", "Tenor", "Bass"] },
    { name: "SSAA", displayName: "SSAA", parts: ["Soprano1", "Soprano2", "Alto1", "Alto2"] },
    { name: "SSAATTBB", displayName: "SSAATTBB", parts: ["Soprano1", "Soprano2", "Alto1", "Alto2", "Tenor1", "Tenor2", "Bari", "Bass"] },
    { name: "CUSTOM", displayName: "Custom", parts: [] }
]
export const STD_VOICINGS = Object.fromEntries(STD_VOICING_LIST.map(v => [v.name, v]))

export const FULL_MIX_TYPE = "Full Mix"
export const STD_MIX_TYPES = [FULL_MIX_TYPE, "Solo", "Dominant", "Left", "Missing"]

export function standardMixes(parts: string[]): Record<string, StereoMix[]> {
    /* The spec for each template is [ltf, lof], [rtf, rof]: left/right-target-factor, left/right-other-factor.
     * For example, if parts is ['Tenor','Lead','Bari','Bass'], then the 'Left' template will have the spec
     * { leftFactors: [1, 0], rightFactors: [0, 1/3] }, and the final 'Bari Left' mix will have the spec
     * { leftFactors: [0, 0, 1, 0], rightFactors: [1/3, 1/3, 0, 1/3] }.
     */
    const n = parts.length
    const templates: Pick<StereoMix, 'name' | 'spec'>[] = [
        { name: "Solo", spec: { leftFactors: [1, 0], rightFactors: [1, 0] } },
        { name: "Dominant", spec: { leftFactors: [n/(2*n - 1), 1/n], rightFactors: [n/(2*n - 1), 1/n] } },
        { name: "Left", spec:  { leftFactors: [1, 0], rightFactors: [0, 1/(n-1)] } },
        { name: "Missing", spec: { leftFactors: [0, 1/(n-1)], rightFactors: [0, 1/(n-1)]}},
    ]
    function mix(template: Partial<StereoMix>, part: string): StereoMix {
        const left = parts.map(p => p == part ? template.spec.leftFactors[0] : template.spec.leftFactors[1])
        const right = parts.map(p => p == part ? template.spec.rightFactors[0] : template.spec.rightFactors[1])
        return {
            name: `${part} ${template.name}`,
            spec: { leftFactors: left, rightFactors: right },
            parts: parts,
            pitchShift: 0,
            speedFactor: 1
        }
    }
    type Entry = [string, StereoMix[]]
    const mixesByType: Entry[] = [[FULL_MIX_TYPE, [fullMixForParts(parts)]] as Entry]
        .concat(templates.map(t => [t.name, parts.map(p => mix(t, p))] as Entry))

    return Object.fromEntries(mixesByType)
}

export function fullMixForParts(parts: string[]): StereoMix {
    const n = parts.length
    return {
        name: FULL_MIX_TYPE,
        parts,
        spec: { leftFactors: parts.map(() => 1/n), rightFactors: parts.map(() => 1/n) },
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

export const TIMED_TEXT_DATA_TYPES = ['MEASURES', 'BOOKMARKS', 'LYRICS'] as const
export type TimedTextDataType = typeof TIMED_TEXT_DATA_TYPES[number]
export type TimedTextByType = Partial<Record<TimedTextDataType, TimedTextEntry[]>>
export type TimedTextByPart = Record<string, TimedTextEntry[]>
export const TIMED_TEXT_SHARED_PART = 'ALL'

export class TimedTextData {
    entriesByPartAndType: Record<string, TimedTextByType>

    constructor(rawByPartAndType: object) {
        // Filter out data that doesn't match the expected type
        this.entriesByPartAndType = Object.fromEntries(
            Object.entries(rawByPartAndType)
                .map(partData => {
                    const filtered = pick(partData[1], TIMED_TEXT_DATA_TYPES)
                    return [partData[0], filtered]
                })
        )
    }

    static forType(type: TimedTextDataType, entriesByPart: TimedTextByPart) {
        const byPartAndType = Object.fromEntries(
            Object.entries(entriesByPart).map(e => [e[0], {[type] : e[1]}])
        )
        return new TimedTextData(byPartAndType)
    }

    getType(type: TimedTextDataType): TimedTextByPart {
        return Object.fromEntries(
            Object.entries(this.entriesByPartAndType)
                // convert to [part, entries-for-part-and-type]
                .map(e => [e[0], e[1][type]]))
    }

    /** The entries for the given part, by type. Empty if the part has no data. */
    getPart(part: string): TimedTextByType {
        return this.entriesByPartAndType[part] ?? {}
    }
}

export interface TimedTextEntry {
    t: number,
    v: string
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

/**
 * Convert an integer number of milliseconds to 'mm:ss.t',
 * where 'mm' is minutes, 'ss' is seconds, and 't' is tenths of a second.
 * E.g.: 76543 -> '1:16.5'
 */
export function millisToMST(millis: number): string {
    if (millis < 0) { return '--'; }
    const ms = Math.floor(millis)
    const tenths = Math.floor((ms % 1000) / 100)
    const sec = Math.floor(ms / 1000)
    const m = Math.floor(sec / 60);
    const s = sec % 60
    const sDisplay = s.toString().padStart(2, '0');
    return `${m}:${sDisplay}.${tenths}`
}
