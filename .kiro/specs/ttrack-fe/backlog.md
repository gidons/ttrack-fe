# Backlog — ttrack-fe

> Tracked items to address. **Not started.** These are captured for planning;
> each should be investigated and (for bugs) root-caused before implementing.
> References point at the current code so the eventual fix is grounded in how
> things actually work today.

## Bugs

### B1. "Edit" during playback navigates to a broken URL

**Symptom:** While playing a track (e.g. a mix), clicking the "Edit" button to
edit song metadata navigates to `<song-url>/mix/<mix-name>/edit` instead of
`<song-url>/edit`, which is broken.

**Context:** Playback is URL-driven. Routes `part/:part/play` and
`mix/:mixName/play` render `ViewOrEditSong`, which selects the track from the URL
params (`src/main.tsx`; `src/components/song/ViewOrEditSong.tsx`). The Edit
button calls `navigate('./edit')` (a relative path), which resolves against the
current `.../play` URL rather than the song root.

**Decision needed (compare options before fixing):**
- Disable the Edit button during playback, or
- Make playback not URL-based (local selection state instead of a route), or
- Make edit not URL-based / use an absolute navigation target
  (`/songs/:songId/edit`), or
- Another approach.

Note: option 5 (tab-based rework, F2 below) may change or remove the URL-driven
playback model, so coordinate B1 with F2.

### B2. Bookmarks view non-functional

**Symptom:** Existing bookmarks don't show up, and in edit mode the "add
bookmark" button appears to do nothing.

**Context:** `src/components/timeddata/EditBookmarks.tsx`. Investigate the load
path (`asyncData.text.getType('BOOKMARKS')`), the merge of shared `ALL` bookmarks
with the selected part, and the add handler that should append
`{ t: playPositionMs, v: "" }`.

### B3. Measures view crashes when there is no existing measure data

**Symptom:** Error `undefined is not an object (evaluating
'(await n.text)?.getPart(Pu).MEASURES')`.

**Context:** `src/components/timeddata/EditMeasures.tsx`. It reads
`asyncData.text.getPart('ALL')['MEASURES']`; `getPart` returns `undefined` when
the `ALL` part has no entries, so indexing `['MEASURES']` throws. Needs a
null-safe access / default to an empty list.

## Features

### F1. Highlight the current measure on the notation during playback

In the Measures view, when playing audio in **non-edit** mode, with existing
measures and a notation file present, the currently-playing measure should be
highlighted on the notation display.

**Context:** `src/components/timeddata/EditMeasures.tsx` +
`src/components/sheet/SheetMusicViewer.tsx` (which already supports
`highlightedMeasureNum` and scroll-into-view). Map the current playback time to
the active measure from the stored measure times and drive
`highlightedMeasureNum`.

### F2. Replace the busy song view with a 3-tab layout

The current main song view (`src/components/song/ViewOrEditSong.tsx`) is too
busy. Replace it with a tabbed view of three tabs: **Parts**, **Mixes**, and
**Non-Audio Data**. On the Parts and Mixes tabs, show the track list on the left
and the player / mix widget on the right.

**Context:** Current detail page renders the metadata form plus side-by-side
Parts/Mixes `TrackList`s and a `SongDataList`, with a separate "now playing"
panel. Building blocks to reuse: `TrackList`, `AudioPlayer`, `StereoMixView`,
`SongDataList`. Consider interaction with the URL-driven playback model (see B1).
