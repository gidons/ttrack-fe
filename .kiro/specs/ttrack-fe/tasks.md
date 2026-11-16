# Tasks — Measure time editing

Work plan for the measures editor changes specified in `requirements.md` §7
(criterion 5) and §9 (criteria 1–6), and designed in `design.md` §9.1–9.3.
Branch: `feature/measure-editing`.

## Tasks

- [x] 1. Make measure numbering consistent in the score viewer
  - [x] 1.1 Give each measure box a 1-based number
    (`parentSourceMeasure.measureListIndex + 1`) in `SheetMusicViewer.tsx`.
  - [x] 1.2 Look up the highlighted measure by that number instead of by array
    position, report that number from `onClickMeasure`, and show it when numbers
    are displayed.
  - _Requirements: §9.2_

- [x] 2. Add the pure measure-list operations (`timeddata/measureTimes.ts`)
  - [x] 2.1 `shiftMeasure` / `canShift`: move an entry by a delta, refusing to
    reach a neighbor, go below 0, or pass the audio duration.
  - [x] 2.2 `splitMeasure`: insert at the midpoint with the next number, renumbering the consecutive measures after it;
    unavailable for the last entry.
  - [x] 2.3 `renameMeasure` (non-blank), `deleteMeasure` (renumbering the consecutive measures after it), and `markMeasure`
    (replace by name, else insert in time order). No mutation of inputs.
  - _Requirements: §9.1, §9.4.1–9.4.5_

- [x] 3. Give `AudioPlayer` an imperative handle
  - [x] 3.1 Expose `seekToMs(ms)` and `playInterval(startMs, endMs)` through a
    `ref` (`AudioPlayerHandle`).
  - [x] 3.2 Stop at the end of an interval to within a few milliseconds
    (animation-frame loop, then a timer for the final stretch), set the position
    to exactly `endMs`, and cancel on pause, seek, a new interval, media change,
    or unmount.
  - _Requirements: §7.5_

- [x] 4. Rework the measures list in `EditMeasures.tsx`
  - [x] 4.1 Widen the list panel and lay each row out as
    `‹ time ›  number  [edit] [play] [split] [delete]`.
  - [x] 4.2 Wire shift, split, delete, and mark to the pure functions; remove the
    in-place array mutation and the position-based `currEntryIndex`.
  - [x] 4.3 Inline rename (Enter confirms, Escape cancels, blank rejected), and
    open the new row for naming when a split cannot pick a free name.
  - [x] 4.4 Play button uses `playInterval`; clicking a time uses `seekToMs`.
  - [x] 4.5 Enable shift, rename, split, and delete only in edit mode; keep play
    and seeking always available. Guard against a non-numeric next-measure field.
  - _Requirements: §9.1, §9.3, §9.4_

- [ ] 5. Verify
  - [x] 5.1 Check each pure function, including limits and ordering.
  - [x] 5.2 Check the interval stop timing and cancellation against a fake audio
    element.
  - [x] 5.3 Render the editor and exercise each row action and the save payload.
  - [x] 5.4 Type-check and build.
  - [x] 5.5 Browser walkthrough (manual): pickup measure highlights as measure 1,
    shift/split/rename/play behave as specified, and play pauses audibly on the
    downbeat.

- [x] 6. Finish
  - [x] 6.1 Re-read `requirements.md` and `design.md` against the final code and
    correct any difference.
  - [x] 6.2 Remove `backlog.md` items that no longer apply.

## Decisions

- **Measure numbers are positions, not OSMD numbers.** See `design.md` §9.2. A
  score whose printed numbering differs from 1..N (for example a pickup numbered
  0) is labeled by position. If automatic measure detection in the service labels
  measures differently, the two need to agree.
- **Split and delete renumber only the consecutive run that follows.** If the
  next measure continues the numbering (N+1), that measure and each one after it
  that counts up by one is shifted by one. A gap (for example, a missed measure
  from detection that the split should fill) or a jump (a reprise) stops it
  immediately, so those are never shifted.
- **No undo.** Edits are local until Save and Back discards them. An undo or a
  cancel-edit action is a possible follow-up.
