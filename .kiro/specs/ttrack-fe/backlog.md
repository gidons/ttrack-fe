# Backlog — ttrack-fe

> Open items. Each should be investigated and (for bugs) root-caused before
> implementing. References point at the current code so a fix is grounded in how
> things actually work today.

## Bugs

### B1. Existing bookmarks reportedly don't appear in the bookmarks view

**Symptom (as reported):** Existing bookmarks don't show up in the bookmarks
editor.

**Status:** Not reproduced. With data in the backend's wire format
(`{ part: { BOOKMARKS: [{ t, v }] } }`), the editor shows shared (`ALL`)
bookmarks by default and a voice part's bookmarks once that part is selected in
the "Bookmarks for" dropdown. Bookmarks stored under a voice part do not appear
while "All Parts" is selected. Needs the specific song and the part its
bookmarks belong to.

**Context:** `src/components/timeddata/EditBookmarks.tsx`; the page loads
`asyncData.text.getType('BOOKMARKS')`.

### B2. Measure and bookmark regions may be stale after a window resize

**Symptom (unverified, from reading the code):** OSMD re-renders the score when
the window is resized, and the measures can move to different systems. The
clickable and highlighted measure regions in `SheetMusicViewer` are computed only
from the `onRender` callback after a load, so they may stay at their old
positions.

**Context:** `src/components/sheet/OpenSheetMusicDisplay.tsx`,
`src/components/sheet/SheetMusicViewer.tsx`. A fix would handle resize in the
wrapper (with OSMD's `autoResize` off) and call `onRender` after each re-render.

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
panel. Playback is URL-driven: the routes `part/:part/play` and
`mix/:mixName/play` render `ViewOrEditSong`, which selects the track from the URL
params, and opening the edit page ends playback. Building blocks to reuse:
`TrackList`, `AudioPlayer`, `StereoMixView`, `SongDataList`.
