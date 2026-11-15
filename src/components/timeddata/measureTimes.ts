import { TimedTextEntry } from "../../types"

/**
 * Pure operations on a list of measure times. Each entry is the time (in ms) at which
 * the measure named by its value starts. The lists are always ordered by time.
 *
 * None of these functions modify their input; they return a new list.
 */

/** How far the shift buttons move a measure. */
export const MEASURE_SHIFT_MS = 100

type MeasureTimes = readonly TimedTextEntry[]

/** Insert an entry in time order, after any entries at the same time. */
function insertByTime(entries: MeasureTimes, entry: TimedTextEntry): TimedTextEntry[] {
    const after = entries.findIndex(e => e.t > entry.t)
    const at = after < 0 ? entries.length : after
    return [...entries.slice(0, at), entry, ...entries.slice(at)]
}

/**
 * Whether the measure at the given index can be moved by deltaMs. It can't reach (or pass)
 * the time of a neighboring measure, go before the start of the audio, or go past its end.
 * @param durationMs the length of the audio, if known
 */
export function canShift(entries: MeasureTimes, index: number, deltaMs: number, durationMs?: number): boolean {
    const entry = entries[index]
    if (!entry) { return false }
    const t = entry.t + deltaMs
    if (t < 0) { return false }
    if (durationMs != null && durationMs > 0 && t > durationMs) { return false }
    const prev = entries[index - 1]
    const next = entries[index + 1]
    if (prev && t <= prev.t) { return false }
    if (next && t >= next.t) { return false }
    return true
}

/** Move the measure at the given index by deltaMs, or return the list unchanged if it can't be moved. */
export function shiftMeasure(entries: MeasureTimes, index: number, deltaMs: number, durationMs?: number): TimedTextEntry[] {
    if (!canShift(entries, index, deltaMs, durationMs)) { return [...entries] }
    return entries.map((e, i) => i === index ? { ...e, t: e.t + deltaMs } : e)
}

export interface SplitResult {
    entries: TimedTextEntry[]
    /** Index of the newly inserted measure. */
    newIndex: number
    /** True if no free name could be chosen, so the new measure's name is blank and must be set. */
    needsName: boolean
}

/** A plain whole number, which is how the measures of a score are named. */
function isNumber(name: string): boolean {
    return /^\d+$/.test(name)
}

/** The measure that follows the given name: "12" -> "13". Empty if the name isn't a plain number. */
function nextName(name: string): string {
    return isNumber(name) ? `${parseInt(name, 10) + 1}` : ''
}

/**
 * How many entries right after the given one continue its numbering: if it is named N, the
 * entries named N+1, N+2, ... in a row. Zero if its name isn't a number or the next entry
 * isn't N+1 (a gap, or a jump to somewhere else such as a reprise).
 */
function consecutiveRunAfter(entries: MeasureTimes, index: number): number {
    const entry = entries[index]
    if (!entry || !isNumber(entry.v)) { return 0 }
    let expected = parseInt(entry.v, 10) + 1
    let count = 0
    for (let i = index + 1; i < entries.length && entries[i].v === `${expected}`; i++) {
        count++
        expected++
    }
    return count
}

/** Add delta to the names of the `count` entries starting at `from`. */
function renumber(entries: MeasureTimes, from: number, count: number, delta: number): TimedTextEntry[] {
    return entries.map((e, i) => (i >= from && i < from + count) ? { ...e, v: `${parseInt(e.v, 10) + delta}` } : e)
}

/**
 * Split the measure at the given index in two by inserting a new measure halfway between it
 * and the next one. The new measure is named for the one after this (e.g. 12 -> 13). If the
 * measures that follow continue the numbering (13, 14, 15, ...), they are each incremented to
 * make room; if they don't (a gap, or a jump elsewhere), they are left alone. If this name isn't
 * a number, the new measure's name is left blank.
 *
 * Returns null if the measure can't be split: it is the last one (where it ends is unknown),
 * or there is no room between it and the next one.
 */
export function splitMeasure(entries: MeasureTimes, index: number): SplitResult | null {
    const entry = entries[index]
    const next = entries[index + 1]
    if (!entry || !next) { return null }
    const t = Math.round((entry.t + next.t) / 2)
    if (t <= entry.t || t >= next.t) { return null }
    const name = nextName(entry.v)
    const shifted = renumber(entries, index + 1, consecutiveRunAfter(entries, index), 1)
    const inserted = insertByTime(shifted, { t, v: name })
    return { entries: inserted, newIndex: index + 1, needsName: name === '' }
}

/** Change a measure's name. A blank name is ignored. */
export function renameMeasure(entries: MeasureTimes, index: number, name: string): TimedTextEntry[] {
    const trimmed = name.trim()
    if (trimmed === '' || !entries[index]) { return [...entries] }
    return entries.map((e, i) => i === index ? { ...e, v: trimmed } : e)
}

/**
 * Remove the measure at the given index. If the measures that follow it continue its numbering
 * (a measure named 12 followed by 13, 14, ...), they are each decremented to close the gap; if
 * they don't (a gap, or a jump elsewhere), they are left alone.
 */
export function deleteMeasure(entries: MeasureTimes, index: number): TimedTextEntry[] {
    if (!entries[index]) { return [...entries] }
    const renumbered = renumber(entries, index + 1, consecutiveRunAfter(entries, index), -1)
    return renumbered.filter((_, i) => i !== index)
}

/**
 * Record that the measure with the given name starts at positionMs. An existing measure with the
 * same name is moved there, and so is any measure that is already at exactly that time (two
 * measures can't start at the same moment, and this happens when the mark is pressed twice
 * before the playback position updates).
 */
export function markMeasure(entries: MeasureTimes, positionMs: number, name: string): TimedTextEntry[] {
    const others = entries.filter(e => e.v !== name && e.t !== positionMs)
    return insertByTime(others, { t: positionMs, v: name })
}

/** True if every measure has a name. */
export function allNamed(entries: MeasureTimes): boolean {
    return entries.every(e => e.v.trim() !== '')
}
