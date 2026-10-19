# Requirements — ttrack-fe

> Reverse-engineered from the existing codebase. This document describes the
> behavior the front-end **currently** implements, framed as requirements, so it
> can serve as a baseline for planned changes and improvements. Where the code
> contains stubs, no-ops, or clearly-incomplete features, those are called out
> explicitly rather than presented as finished behavior.

## Overview

`ttrack-fe` is the web front-end ("TTrack Manager") for the TTrack system, a tool
for rehearsing choral (barbershop-style) music. It is a single-page React
application that lets a data manager create and curate songs and their associated
content: audio **parts** (one mono track per voice), **mixes** (stereo tracks
that blend parts with per-channel weighting, pitch, and speed), **timed text**
(bookmarks and measure markers), and **notation** (MusicXML scores). It talks to
the `ttrack-service` backend over REST.

The system has three parts, each in its own Git repository:

- **ttrack-service** (`gidons/ttrack-service`) — Spring Boot backend.
- **ttrack-fe** (this repo, `gidons/ttrack-fe`) — web front-end for managing songs
  and data.
- **ttrack-android / TTrackPlayer** (`gidons/ttrack-android`) — mobile player that
  downloads and plays songs.

The front-end is a *management* client: it is the write-side companion to the
backend's data model. The mobile player is the primary read-side consumer. The
front-end also provides playback and visualization (audio scrubbing, stereo-mix
sliders, sheet-music rendering) in service of editing and verifying data.

## Glossary

- **Song** — a unit of music with metadata (title, short title, arranger, key,
  voicing) and associated tracks, timed data, and notation.
- **Voicing** — the set of voice parts a song is arranged for (e.g. TLBB, SATB).
  The front-end ships a fixed catalog of standard voicings plus a `CUSTOM` option.
- **Part track** — single-channel (mono) audio for one voice part; identified by
  the part name (e.g. `Bass`).
- **Mix track** — stereo audio produced by blending part tracks with per-part
  left/right gain factors, optionally pitch-shifted and/or speed-adjusted.
- **Mix spec (`StereoMixSpec`)** — the per-part `leftFactors` / `rightFactors`
  gain arrays that define a stereo mix.
- **Standard mix** — one of a generated catalog of mixes derived from a song's
  parts: Full Mix, and per-part Solo / Dominant / Left / Missing.
- **Mix package** — a request that creates several mixes at once from a list of
  mix descriptions, sharing a common pitch/speed and an optional name suffix.
- **All-channel mix** — the backend-managed mix whose track id is `All`; the
  front-end hides it from the mixes list and forbids deleting it.
- **Timed text data** — time-stamped text entries per part and type; the
  front-end works with `MEASURES` and `BOOKMARKS` (and models `LYRICS`), where a
  special `ALL` part denotes data shared across all parts.
- **Notation** — a MusicXML file attached to a song, rendered as sheet music.
- **Async task** — a long-running backend operation (mixing, zipping) tracked by
  a task id the front-end polls until completion.

---

## Requirements

### 1. Authentication and access control

**User story:** As the system owner, I want the app gated behind sign-in, so that
only authenticated users can view or manage song data.

#### Acceptance criteria

1. The application SHALL integrate Clerk for authentication, initialized with a
   publishable key read from the `VITE_CLERK_PUBLISHABLE_KEY` environment
   variable, and SHALL fail to start if that key is absent.
2. The public landing page SHALL present a sign-in affordance to signed-out
   users and SHALL redirect to `/songs` after a successful sign-in.
3. The entire `/songs` area (song list, song detail, and all sub-pages) SHALL be
   protected: an unauthenticated user SHALL be redirected to sign-in.
4. The application shell SHALL display a sign-in control when signed out and a
   user/account control when signed in.
5. Every backend request SHALL carry the signed-in user's Clerk session token as
   an `Authorization: Bearer <token>` header, obtained from Clerk at request time.
6. The target backend base URL SHALL be configured via the `VITE_BACKEND_URL`
   environment variable (local development points at the localhost service; the
   deployed app points at the hosted service).

### 2. Browse and list songs

**User story:** As a data manager, I want a browsable catalog of songs, so that I
can find and open the one I want to work on.

#### Acceptance criteria

1. WHEN the song list loads THEN the app SHALL fetch the songs from the backend
   and present them in a data grid showing title, short title, arranger, key, and
   voicing (voicing rendered via its display name).
2. WHEN the song fetch fails THEN the app SHALL surface the error in an alert
   rather than silently failing.
3. The song list SHALL provide a Refresh action that re-fetches the list, and a
   Create action that navigates to the new-song form.
4. WHEN a row is clicked THEN the app SHALL navigate to that song's detail page;
   the row's Edit action SHALL navigate to the song's edit form.
5. **Known gap:** the song list's per-row Delete action is currently a stub (it
   only shows a browser `alert`) and does not delete the song. Song deletion is
   available from the song detail page (see §3).

### 3. Create, view, edit, and delete a song

**User story:** As a data manager, I want to create songs and edit their
metadata, so that the catalog reflects the choir's repertoire.

#### Acceptance criteria

1. The app SHALL provide a create-song form capturing title, short title,
   arranger, key, and voicing; WHEN submitted THEN it SHALL POST the song to the
   backend and navigate to the new song's detail page.
2. The song detail page SHALL present the same metadata fields in a read-only
   form by default, with an Edit action that switches the form to editable.
3. WHEN an edit is saved THEN the app SHALL PUT the updated song (including its
   `eTag` for optimistic concurrency), merge the backend response into local
   state, and return to the read-only view.
4. The song detail page SHALL provide a Delete action that first asks for
   confirmation and, on confirm, DELETEs the song, navigates back to the list,
   and shows a success notification (or an error notification on failure).
5. The key field SHALL be editable through a specialized control that parses a
   musical key into note letter, sharp/flat, and minor components, and SHALL
   display sharps/flats using ♯/♭ glyphs.
6. The voicing field SHALL be a dropdown over the standard voicing catalog.
7. **Known gap:** form validation is currently a no-op (a TODO placeholder); the
   create and edit forms do not enforce required fields or formats beyond what
   the backend rejects.

### 4. Manage part tracks (mono voice audio)

**User story:** As a data manager, I want to upload and manage the mono audio for
each voice part, so that mixes can be generated and parts can be downloaded.

#### Acceptance criteria

1. The song detail page SHALL list the song's part tracks with, per part, the
   part name, duration, and a relative "last updated" time (or an "updating..."
   indicator while a backend task is operating on the track).
2. The app SHALL provide an upload dialog that can upload one or more parts in a
   single submission; for a standard voicing it SHALL pre-populate rows for the
   parts not yet present, and SHALL support adding a custom-named part.
3. WHEN parts are uploaded THEN the app SHALL send the audio files to the backend
   (overwriting existing parts) and refresh the part list.
4. Each listed part SHALL offer Play and Download actions, where Download fetches
   the part's media via its download URL and saves it locally.
5. **Known gap:** deleting a part is currently disabled in the UI (parts cannot
   be removed from the front-end; tracked as a backlog item to allow deleting
   parts not referenced by any mix).

### 5. Create and manage mixes

**User story:** As a data manager, I want to define and generate mixes that blend
parts with per-channel weighting, pitch, and speed, so that singers can rehearse
against configurable backing tracks.

#### Acceptance criteria

1. The song detail page SHALL list the song's mix tracks (excluding the
   backend-managed `All` mix) with the mix name, duration, and last-updated time,
   and SHALL offer Play, Download, Edit, and Delete actions per mix.
2. Deleting a mix SHALL ask for confirmation and then DELETE the mix track; the
   `All` mix SHALL NOT be deletable.
3. The app SHALL provide a single-mix dialog that lets the user either pick one
   of the generated standard mixes for the song's parts (Full Mix, or per-part
   Solo / Dominant / Left / Missing, excluding names that already exist) or
   define a Custom mix by naming it and editing the per-part left/right gain
   factors directly.
4. WHEN a single mix is submitted THEN the app SHALL POST it to the backend; for
   a custom mix it SHALL send the explicit stereo spec, and WHEN editing an
   existing mix it SHALL request overwrite.
5. The app SHALL provide a bulk "mix package" dialog that lets the user select
   multiple mix types/parts via a checkbox tree, set a shared pitch shift and
   speed factor, and supply an optional package-name suffix; WHEN submitted THEN
   it SHALL POST a mix-package request that the backend expands into one mix per
   selected description.
6. The standard-mix catalog SHALL be computed on the client from the song's parts
   using fixed blending templates (Solo = target only; Left = target on the left
   and the others spread on the right; Dominant = target weighted above the rest;
   Missing = everyone except the target; Full Mix = all parts evenly on both
   channels).
7. Mix creation and editing SHALL support a pitch shift (in semitones) and a
   speed factor, entered through dedicated stepper controls with bounded ranges.

### 6. Edit stereo mix factors and playback parameters

**User story:** As a data manager, I want a visual editor for a mix's channel
balance and its pitch/speed, so that I can shape a mix precisely.

#### Acceptance criteria

1. The app SHALL render a mix as a per-part table of Left and Right gain sliders
   (range 0..1) with numeric readouts.
2. WHEN one part's factor is changed in editable mode THEN the editor SHALL
   proportionally rebalance the remaining parts' factors so the channel's total
   level is preserved.
3. The mix editor SHALL embed a pitch/speed control: pitch shift in semitones and
   a speed factor expressed as a percentage, each constrained to a bounded range.
4. WHEN a track is selected for playback THEN its mix SHALL be shown read-only
   alongside the audio player.

### 7. Audio playback

**User story:** As a data manager, I want to play a selected part or mix with a
timeline, so that I can review audio and place timed markers against it.

#### Acceptance criteria

1. WHEN the user chooses to play a part or mix THEN the app SHALL show a "now
   playing" panel with audio playback sourced from the track's media URL.
2. The app SHALL provide a custom transport with a scrubber the user can click or
   drag to seek, showing current position and progress.
3. The player SHALL render tick marks for timed entries (e.g. measures or
   bookmarks) with tooltips showing the marker time and label, and SHALL support
   jumping to the previous/next marker.
4. The player SHALL support rewind/forward by one second, play/pause, a playback
   speed control, keyboard shortcuts (space to play/pause, arrow keys to step,
   and a key to drop a marker), and SHALL report the current playback position to
   its host component.

### 8. Notation (sheet music)

**User story:** As a data manager, I want to attach and view a song's MusicXML
score, so that I can reference and verify the notation.

#### Acceptance criteria

1. The app SHALL provide a notation page where the user can upload (or replace) a
   MusicXML file for the song and delete the existing notation (behind a
   confirmation).
2. WHEN a song has a notation file THEN the app SHALL render the score using
   OpenSheetMusicDisplay.
3. The sheet-music viewer SHALL overlay interactive measure regions so that
   individual measures can be highlighted and clicked, supporting measure-time
   editing (see §9).

### 9. Edit timed text data (measures and bookmarks)

**User story:** As a data manager, I want to attach time-stamped markers to a
song, so that the player can display content synchronized to playback.

#### Acceptance criteria

1. The app SHALL provide a measures editor that associates measure numbers with
   playback times for the shared (`ALL`) part: while playing, the user can stamp
   the current position with the next measure number (auto-incrementing), and can
   click a measure in the rendered score to set the target measure number.
2. The measures editor SHALL require the song to have notation before measures
   can be edited, SHALL list the captured (time, measure) entries with per-row
   delete, and SHALL provide Save and Clear-All (confirmed) actions.
3. The app SHALL provide a bookmarks editor that manages bookmarks per part plus
   a shared (`ALL`) set; the user selects which part's bookmarks to edit, sees the
   shared bookmarks merged in (read-only) and sorted by time, and can add a
   bookmark at the current playback position, edit its description, and delete it.
4. WHEN measures or bookmarks are saved THEN the app SHALL PUT the data to the
   backend and refresh the song's timed-text data.
5. The song detail page SHALL present a "non-audio data" summary listing MusicXML,
   Lyrics, Bookmarks, and Measure Times with an availability indicator (e.g. Yes /
   No / "N/M parts") and an Edit action linking to the relevant editor.
6. **Known gap:** a lyrics editor is modeled in the data types and summary but is
   not yet implemented (its route is commented out); an earlier per-part bookmarks
   editor is parked in a `holding/` directory and is not wired into the app.

### 10. Bulk download (zip)

**User story:** As a user, I want to download several of a song's tracks as one
archive, so that I can grab everything at once.

#### Acceptance criteria

1. The track lists SHALL offer a "download zip" action that submits the selected
   track ids to the backend's zip endpoint and receives a task id.
2. WHEN a zip is requested THEN the app SHALL poll the task to completion and
   reflect progress through button states (ready → in progress → succeeded /
   failed).
3. WHEN the zip task succeeds THEN the app SHALL expose the resulting archive's
   download URL so the user can download it; WHEN it fails THEN the app SHALL
   notify the user.

### 11. Asynchronous task feedback

**User story:** As a user, I want the app to reflect the progress of long-running
backend operations, so that I know when content is being generated.

#### Acceptance criteria

1. The app SHALL model long-running backend operations (mixing, zipping) as tasks
   identified by a task id, and SHALL poll a task's status endpoint on an interval
   until the task reports that it has ended.
2. WHEN a track has an in-flight backend task THEN its list row SHALL show an
   "updating..." state in place of a last-updated time.

### 12. Application shell and UX conventions

**User story:** As a user, I want a consistent, themed interface with clear
feedback, so that the tool is pleasant and predictable to use.

#### Acceptance criteria

1. The app SHALL present a consistent shell with a header (logo, product title,
   and auth control) and a page container providing breadcrumbs, a page title, and
   an actions area.
2. The app SHALL apply a single Material UI theme (dark Clerk appearance; a
   dashboard-style MUI theme with custom data-grid styling) across all pages.
3. The app SHALL provide reusable, imperative dialog helpers (alert / confirm /
   prompt / form dialog) and a snackbar-based notification system, and SHALL use
   them for confirmations and success/error feedback across create, update,
   delete, upload, and zip flows.
4. Pages that load data asynchronously SHALL show a loading indicator while
   fetching and SHALL render an error alert if the load fails.

### 13. Build, test, and deployment

**User story:** As a developer/operator, I want the app to build, type-check,
test, and deploy reliably, so that changes ship safely.

#### Acceptance criteria

1. The project SHALL build with Vite (output to `build/`) and SHALL provide npm
   scripts for dev server, build, preview, type-check (`tsc --noEmit`), and test
   (Vitest).
2. Continuous integration SHALL run on pushes and pull requests to `main`,
   installing dependencies and running the type-check and the test suite on
   Node 20.
3. The app SHALL deploy to Azure Static Web Apps via GitHub Actions on pushes to
   `main`, serving the built `build/` output, with SPA fallback routing and a
   401 → landing-page redirect configured in the Static Web App config.
4. **Known gap:** there is effectively no unit-test coverage in `src/` (the test
   job passes with no tests); linting exists as config but is not run in CI and
   has no npm script.

---

## Non-functional notes

- **Platform:** React 19 + TypeScript 5, built with Vite 7; Node ≥ 20.
- **UI:** Material UI (`@mui/material`, icons, `x-data-grid`, `x-tree-view`).
- **Auth:** Clerk (`@clerk/react-router`), dark appearance.
- **HTTP:** `axios`, one client per `useBackend()` call, with a Clerk-token
  request interceptor.
- **Sheet music:** `opensheetmusicdisplay` (OSMD).
- **TypeScript config:** `strict` is currently **off**; `@types/react` is pinned
  to v18 while React is v19 (minor type mismatch).
- **Audio:** playback uses the native HTML `<audio>` element. `react-player` is a
  declared dependency but is **not** actually used.

## Known issues / TODO carried from the codebase

Recorded as context for future work, not as implemented behavior:

- Song-list row Delete is a stub (`alert` only); real delete is only on the detail
  page.
- Create/edit song validation is a no-op TODO.
- Part deletion is disabled in the UI (SCRUM-38: allow deleting parts not used by
  any mix).
- Lyrics editing is modeled but unimplemented (route commented out); the shared
  (`data/lyrics`) editor is absent.
- `holding/BookmarksEditor.tsx` (+ its test) is parked, excluded from the build,
  and not referenced; `App.tsx` and `SongForm.tsx` are orphaned/legacy and unused.
- `react-player` is an unused dependency.
- `useBackend` creates a new axios client on every call (not memoized).
- `getTask`'s 404 branch is unreachable because axios rejects on 404 by default;
  `waitForTask` can loop indefinitely if a task never ends.
- `reloadAsyncData` as exposed on the song-page outlet context ignores its
  argument and always reloads all async data.
- Several editor interactions mutate arrays in place before setting state.
- `README.md` and `.github/copilot-instructions.md` are stale: they describe a
  Create React App project (`src/index.tsx`, `src/data/songs.tsx`, `validateSong`,
  port 3000). The project is actually Vite-based (`src/main.tsx`,
  `src/backend/useBackend.ts`), with no `src/data` layer. Treat the source as
  authoritative.
- `.env` and `.env.local` are committed; they contain a Clerk `pk_test`
  publishable key (public by design) and Azure subscription/tenant IDs — no secret
  keys, but checking these in is worth revisiting.
