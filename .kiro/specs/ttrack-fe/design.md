# Design — ttrack-fe

> Reverse-engineered from the existing codebase. Describes the architecture,
> components, data flow, and key patterns as currently implemented, with file
> references so future changes can be grounded in how the code actually works.

## 1. Context

`ttrack-fe` is the web front-end of a three-part system for rehearsing choral
music:

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────────┐
│  ttrack-fe      │     │  TTrackPlayer   │     │  (operators / CI)    │
│  (this repo;    │     │  (Android app,  │     │                      │
│   React/TS SPA) │     │   Kotlin)       │     │                      │
└────────┬────────┘     └────────┬────────┘     └──────────┬───────────┘
         │  manage data          │  download & play         │  deploy/ops
         ▼                       ▼                           ▼
                  ┌────────────────────────────────────┐
                  │           ttrack-service            │
                  │        (Spring Boot 3.5, Java 21)   │
                  └────────────────────────────────────┘
```

The front-end is the management client: it creates songs, uploads parts, defines
and generates mixes, edits timed-text markers, and attaches notation. It also
provides playback and visualization to help verify that data. It authenticates
with Clerk and calls the same REST API that the Android player uses, passing a
Clerk bearer token on every request.

Deployment target is **Azure Static Web Apps**; the backend runs as a separate
Azure Web App.

## 2. Technology and runtime

- **Language/framework:** React 19 + TypeScript 5.
- **Build tool:** Vite 7 (`@vitejs/plugin-react`), output to `build/`
  (`vite.config.js`). Dev server on port 5173.
- **Entry point:** `src/main.tsx` (mounts `#root` from `index.html`).
- **UI:** Material UI — `@mui/material`, `@mui/icons-material`,
  `@mui/x-data-grid`, `@mui/x-tree-view`, with Emotion styling.
- **Routing:** `react-router` v7 (`BrowserRouter` + `<Routes>`).
- **Auth:** Clerk (`@clerk/react-router`, `@clerk/clerk-react`, `@clerk/themes`).
- **HTTP:** `axios`.
- **Sheet music:** `opensheetmusicdisplay` (OSMD).
- **Audio:** native HTML `<audio>` element. (`react-player` is a declared but
  unused dependency.)
- **Testing:** Vitest + Testing Library + jsdom (`vitest.config.ts`,
  `src/setupTests.ts`).
- **Lint:** ESLint 8 (`.eslintrc.json`) — config present, no npm script, not run
  in CI.

TypeScript config (`tsconfig.json`): `strict: false`, target es2021,
`jsx: react-jsx`, `types: ["vite/client"]`; includes `src`, excludes `build`,
`holding`, `node_modules`. `@types/react` is pinned to v18 (React is v19).

## 3. Application structure

```
src/
  main.tsx                 app bootstrap: providers + router + routes
  App.tsx                  legacy/orphaned (renders <SongList/>); unused
  Welcome.tsx              public landing + Clerk <SignIn>
  types.ts                 domain types, voicing/mix catalogs, helpers
  index.css / App.css      global styles
  reportWebVitals.ts       no-op web-vitals reporter
  backend/
    useBackend.ts          axios client + all REST calls + DTO mapping
    AuthContext.tsx        React context carrying Clerk getToken/userId
  components/
    MainLayout.tsx         app shell; bridges Clerk auth into AuthContext
    SongList.tsx           /songs grid
    SongForm.tsx           legacy standalone form (unused)
    TTrackIcon.tsx         SVG logo (svgr-generated)
    utils.tsx              helpers: omit/pick/isEmpty/sleep/download/…
    common/                reusable UI (see §7)
      PageContainer.tsx, StandardForm.tsx, TableHeader.tsx,
      LoadingComponent.tsx, ProtectedContent.tsx, AudioPlayer.tsx,
      StereoMixView.tsx, PitchAndSpeedControl.tsx, ValueSpinner.tsx,
      KeyField.tsx
    song/                  song-detail feature (see §5)
      SongPage.tsx, ViewOrEditSong.tsx, CreateSong.tsx, SongDataList.tsx,
      TrackList.tsx, UploadPartDialog.tsx, MixDialog.tsx, SingleMixDialog.tsx,
      BulkMixDialog.tsx, DownloadZipButton.tsx, ViewSongSheet.tsx
    sheet/                 OSMD integration (see §8)
      OpenSheetMusicDisplay.tsx, SheetMusicViewer.tsx,
      SheetMusicViewerContext.tsx
    timeddata/             timed-text editors (see §9)
      EditMeasures.tsx, EditBookmarks.tsx
  hooks/
    useDialogs/            imperative dialog system (Toolpad-style)
    useNotifications/      snackbar notification queue
  theme/
    AppTheme.tsx, themePrimitives.tsx, dataGrid.tsx
  data/                    (empty — legacy; no data layer lives here)
holding/                   parked, excluded code: BookmarksEditor(.test)
```

Layering: **Route components → `useBackend()` (data layer) → axios → backend.**
Pages consume shared UI (`common/`) and cross-cutting providers
(`useDialogs`, `useNotifications`, `AuthContext`, theme). Domain shapes and
pure helpers live in `src/types.ts`.

## 4. Bootstrap, providers, and routing (`src/main.tsx`)

`main.tsx` mounts into `#root` under `React.StrictMode` with this provider
nesting (outside → in):

```
DialogsProvider → NotificationsProvider → AppTheme → BrowserRouter → ClerkProvider → Routes
```

- `VITE_CLERK_PUBLISHABLE_KEY` is read at startup; the app throws if it is
  missing. `ClerkProvider` uses `appearance={{ theme: dark }}`.
- `reportWebVitals()` is invoked at the end (no-op reporter).

Route table (`react-router` v7):

| Path | Component | Notes |
|---|---|---|
| `/` | `MainLayout` | app shell, renders `<Outlet/>` |
| `/` (index) | `Welcome` | public landing + Clerk `<SignIn>` |
| `/songs` | `ProtectedContent` | Clerk `<Protect>` gate; renders `<Outlet/>` |
| `/songs` (index) | `SongList` | song grid |
| `/songs/new` | `CreateSong` | create form |
| `/songs/:songId` | `SongPage` | loads song + async data; provides context |
| `/songs/:songId` (index) | `ViewOrEditSong` | read-only detail |
| `/songs/:songId/edit` | `ViewOrEditSong isEditingSong` | editable detail |
| `/songs/:songId/data/notation` | `ViewSongSheet` | upload/view MusicXML |
| `/songs/:songId/data/measures` | `EditMeasures` | measure-time editor |
| `/songs/:songId/data/bookmarks` | `EditBookmarks` | bookmarks editor |
| `/songs/:songId/part/:part/play` | `ViewOrEditSong` | selects a part to play |
| `/songs/:songId/mix/:mixName/play` | `ViewOrEditSong` | selects a mix to play |

A commented-out `data/lyrics` route marks lyrics editing as planned but not
implemented. `src/App.tsx` is not referenced by the router and is effectively
dead.

## 5. Song-detail feature and the async-data pattern

`SongPage.tsx` is the layout route for `/songs/:songId`. It owns:

- `song` state (fetched via `backend.song(id).get()`), and
- `asyncData`: `{ parts, mixes, text }` held as **Promises**, created by
  `loadAsyncData(requestedTypes?)` which regenerates only the requested promises
  (defaults to all): `listParts()`, `listMixes()`, `getText()`.

It renders a `PageContainer` with a dynamic title/breadcrumbs and an
`<Outlet context={SongPageContext}/>`. `SongPageContext` exposes:

- `songState: [song, setSong]`
- `asyncData` (the three promises)
- `setChildProps` (children set subtitle/breadcrumbs)
- `reload()` (flips `isLoading` to trigger a re-fetch)
- `reloadAsyncData(types)` — **note:** the version wired into the outlet context
  ignores its argument and reloads everything, even though children call it with a
  specific type (e.g. `'text'`).

Children `await` the promises they need and re-run when a promise's identity
changes. This "promise-passing" flow lets each sub-page load its slice lazily and
be refreshed independently.

Key sub-pages:

- **`ViewOrEditSong.tsx`** — the hub. Renders a `StandardForm<Song>` (title,
  shortTitle, arranger, key via `KeyField`, voicing dropdown) that is read-only
  unless `isEditingSong`. Save → `songClient.update({ ...values, id, eTag })` →
  `setSong(merged)` → navigate back. Delete → `dialogs.confirm` →
  `songClient.delete()` → navigate `/songs` + notification. Below a divider it
  shows two `TrackList`s side by side — **Parts** (from `asyncData.parts`;
  `canDelete=false`; add dialog `UploadPartDialog`) and **Mixes** (from
  `asyncData.mixes` filtered to drop `trackId === 'All'`; `canDelete` for
  non-`All`; add dialog `MixDialog`) — plus a `SongDataList`. On a `.../play`
  route, the matching track is selected via `TrackList.onFoundSelected` and a
  "now playing" panel shows a native `<audio controls autoPlay>` and a read-only
  `StereoMixView`. Form `validate` is a no-op TODO.
- **`CreateSong.tsx`** — `/songs/new`. Same `StandardForm<Song>` (always
  editable). Submit → `backend.createSong(values)` → navigate to the new song.
- **`SongDataList.tsx`** — "Non-Audio Data" grid. Rows: MusicXML (from
  `song.notationUrl`), and Lyrics/Bookmarks/Measure Times computed from
  `asyncData.text`. Availability is "Yes"/"No"/"N/M parts" based on how many parts
  have data (shared `ALL` counts as all). Edit navigates to
  `/songs/:id/data/:type`.

## 6. Data access layer (`src/backend/useBackend.ts`)

`useBackend()` returns a `Backend` object. It creates a fresh axios instance per
call (`axios.create({ baseURL: VITE_BACKEND_URL })` — **not memoized**) and, if
`AuthContext.getToken` is present, registers a request interceptor that sets
`Authorization: Bearer <token>`.

`AuthContext` (`backend/AuthContext.tsx`) is `{ getToken, userId }`, defaulting to
nulls, and is populated by `MainLayout` from Clerk's `useAuth()`. This is the one
bridge from Clerk to the HTTP layer.

**Download URL formation:** `getDownloadUrl(path)` (exposed as `backend.url`)
returns `path` unchanged if it starts with `http`, else prefixes `serverUrl`.
Used for `<audio src>` and sheet URLs. (Media URLs from the backend are
time-limited signed URLs, so they are already absolute.)

**DTO ↔ domain mapping** (dates arrive as strings; the server nests mix data
under different keys):

- `TrackDTO.created/updated` (strings) → `Date` via `trackDtoToTrack`.
- `partTrackDtoToPartTrack` adds `part = dto.trackId`.
- `mixDtoToMix` renames server `mix` → `spec`; `mixTrackDtoToMixTrack` renames
  server `mixInfo` → `mix`.

**Clients and endpoints** (all relative to `VITE_BACKEND_URL`):

Top-level `Backend`:
- `listSongs()` → `GET /songs`
- `createSong(partial)` → `POST /songs`
- `song(id)` → `SongClientImpl`
- `url(path)` → `getDownloadUrl`
- `download(url)` → `GET {url}` returning `.data`
- `waitForTask(taskId)` → poll `GET /tasks/{id}` every 3s until `task.ended`

`SongClientImpl` (`basePath = /songs/{id}`):
- `get()` → `GET /songs/{id}?extended=true`
- `update(song)` → `PUT /songs/{id}`; strips extended fields (`parts`,
  `mediaUrl`, `notationUrl`) from the response and merges onto the submitted song
- `delete()` → `DELETE /songs/{id}`
- `deleteTrack(trackUrl)` → `DELETE {trackUrl}` (uses the track's own `url`)
- `listParts()` → `GET /songs/{id}/parts`
- `listMixes()` → `GET /songs/{id}/mixes`
- `getText()` → `GET /songs/{id}/text` → `new TimedTextData(...)`
- `putText(data)` → `PUT /songs/{id}/text` with `data.entriesByPartAndType`
- `uploadPart(name, file)` → `PUT /songs/{id}/parts/{name}` (multipart `audioFile`)
- `uploadParts(parts[], files[])` → `PUT /songs/{id}/parts?overwrite=true`
  (multipart, pairs `file{n}`/`part{n}`, skips nulls)
- `createMix(mix, isCustom, overwrite)` →
  `POST /songs/{id}/mixes?overwrite={overwrite}` with
  `{ name, parts, pitchShift, speedFactor, description }` where `description =
  JSON.stringify(mix.spec)` only when custom; returns the first element
- `createMixPackage(props)` → `POST /songs/{id}/mixes` with
  `{ parts, mixDescriptions, packageDescription, speedFactor, pitchShift }`
- `submitZipMixesRequest(trackIds)` → `POST /songs/{id}/zip` → task id (string)
- `uploadNotation(file)` → `PUT /songs/{id}/notation` (multipart `file`)
- `deleteNotation()` → `DELETE /songs/{id}/notation`
- `part(part)` → `PartClientImpl`

`PartClientImpl` (`basePath = /songs/{id}/parts/{part}`):
- `get()` → `GET …/parts/{part}`
- `getAllText()` → `GET …/text` → `new TimedTextData`
- `getText(type)` → `GET …/text/{type}`
- `putText(type, entries)` → `PUT …/text/{type}`
- `uploadMedia(file)` → `PUT …/parts/{part}` (multipart `audioFile`)

**Error handling:** `useBackend` does no try/catch; rejected promises propagate to
callers, which surface them via `LoadingComponent`'s error state or
`useNotifications`. Gotchas: `getTask`'s `status == 404` branch is unreachable
(axios rejects on 404), and `waitForTask` can loop forever if a task never ends.

## 7. Domain model and helpers (`src/types.ts`)

- **`Song`**: `id, title, shortTitle?, arranger?, key?, voicing?, durationSec?,
  parts: string[], mediaUrl?` (the `All`-mix media), `notationUrl?, eTag?`.
  `isCreatableSong(partial)` → requires a title.
- **`StereoMixSpec`**: `{ leftFactors: number[], rightFactors: number[] }`
  (per-part gain for L and R). **`StereoMix`**: `{ name, parts, spec, pitchShift,
  speedFactor }`; `NULL_STEREO_MIX` for empty state.
- **Voicings** — `Voicing` + `STD_VOICING_LIST`: `BB` (displayed "TLBB":
  Tenor/Lead/Bari/Bass), `TTBB`, `SATB`, `SSAA`, `SSAATTBB`, and `CUSTOM`
  (empty); `STD_VOICINGS` is the lookup map.
- **Mix catalog** — `FULL_MIX_TYPE = "Full Mix"`;
  `STD_MIX_TYPES = [Full Mix, Solo, Dominant, Left, Missing]`.
  - `standardMixes(parts)` → `Record<type, StereoMix[]>` built from templates
    (Solo = target only; Left = target left / others right; Dominant = target
    weighted up; Missing = everyone but the target), naming each `"{Part} {Type}"`.
  - `fullMixForParts(parts)` → even `1/n` gain on both channels.
- **Tracks** — `TrackInfo` (readonly: `trackId, songId, durationSec, created,
  updated, currentTaskId, url, mediaUrl`); `PartTrack extends TrackInfo { part }`;
  `MixTrack extends TrackInfo { mix }`; `Track = PartTrack | MixTrack`. Guards:
  `isMixTrack`, `isPartTrack`, `isValidTrack`/`…Mix`/`…Part`;
  `isTrackUpdating(t)` → `!!t.currentTaskId`; `trackName(t)`; `stereoMix(t)`
  (mix for mix tracks, a 1.0/1.0 single-part mix for parts, else `NULL_STEREO_MIX`).
- **Timed text** — `TIMED_TEXT_DATA_TYPES = ['MEASURES','BOOKMARKS','LYRICS']`;
  `TIMED_TEXT_SHARED_PART = 'ALL'`; `TimedTextEntry = { t: number (ms), v: string }`.
  Class `TimedTextData` wraps `entriesByPartAndType` (filtering out unknown types
  on construction) with helpers `forType`, `getType`, `getPart`.
- **Formatting** — `secondsToHMS(seconds)` → `h:mm:ss` / `m:ss` / `--`;
  `millisToMST(millis)` → `m:ss.t` (tenths), used by the player and timed-data
  tables.

## 8. Parts, mixes, and async tasks (UI)

- **`TrackList.tsx`** — generic grid reused for both parts and mixes. Props:
  `typeColumns`, `trackPromise`, `reloadTracks`, `selected`, `onFoundSelected`,
  `canDelete`, `playButtonPath`, and an `addDialog` render-prop. Columns: type
  columns + Duration (`secondsToHMS`) + Updated (relative time, or "updating..."
  when `isTrackUpdating`) + actions (Play, Download via `utils.download`, Edit →
  opens the add dialog targeting the track, Delete → `dialogs.confirm` →
  `songClient.deleteTrack(row.url)` → reload). Toolbar has Refresh, a
  `DownloadZipButton`, and Add. Avoids showing the spinner on refresh so updates
  feel live.
- **`UploadPartDialog.tsx`** — multi-row uploader. For a new upload it prefills
  rows for the voicing's missing parts (or one custom row); edit mode locks to the
  target part. Submit → `songClient.uploadParts(parts, files)`.
- **`MixDialog.tsx`** — toggles between `SingleMixDialog` and `BulkMixDialog`
  (bulk only when not editing a specific track).
- **`SingleMixDialog.tsx`** — create/edit one mix. Offers a dropdown of standard
  mixes (`standardMixes(song.parts)` minus existing names) plus "Custom"; for
  custom you name the track and edit factors via an editable `StereoMixView`.
  Submit → `songClient.createMix(mix, isCustom, overwrite=isEdit)`.
- **`BulkMixDialog.tsx`** — "mix package" creator. A `RichTreeView` (checkbox,
  multiSelect) lists mix types with per-part children (Full Mix as a leaf); a
  package-description suffix is appended to names; includes a
  `PitchAndSpeedControl`. Submit → `songClient.createMixPackage(...)`. Existing
  mixes are pre-selected and filtered out.
- **`DownloadZipButton.tsx`** — a state machine
  (`DISABLED | READY | INPROGRESS | SUCCEEDED | FAILED`). On click:
  `submitZipMixesRequest(trackIds)` → `waitForTask(taskId)`; on success reads
  `task.output.downloadUrl` and offers a download; on failure notifies. This is
  the canonical end-to-end async-task-polling example.

**Async task model:** long-running backend operations (mix creation/refresh,
zipping) are represented by a task id. The UI polls `GET /tasks/{id}` every 3s via
`waitForTask` and reflects in-flight work through `isTrackUpdating` ("updating...")
and the zip button's states.

## 9. Audio, mix editing, and sheet music

### 9.1 Playback and mix controls (`components/common`)

- **`AudioPlayer.tsx`** — a custom transport over a hidden native `<audio>`.
  Props: `mediaUrl, marks, positionMs, actions?, onMark?, onTime`. Renders a
  clickable/draggable scrubber with a progress fill, a playhead, and tick marks
  per `mark` (tooltip `millisToMST(t)` + label). Controls: rewind/forward 1s,
  prev/next mark (prev "snaps to current mark first"), play/pause, injectable
  `actions`, and a speed `ValueSpinner` (50–150%). Keyboard (when not in an
  input): Space=play/pause, M=`onMark`, ←/→=step 1s. Reports position up via
  `onTime` (ms); resets on `mediaUrl` change.
- **`StereoMixView.tsx`** — renders a `StereoMix` as a per-part table of
  Left/Right sliders (0–1) plus numeric readouts and an embedded
  `PitchAndSpeedControl`. `updateFactors` proportionally rebalances the other
  parts so the non-target total scales to preserve the channel level. Editable
  only when `isEditable`; emits via `onMixChange`.
- **`PitchAndSpeedControl.tsx`** — two `ValueSpinner`s: pitch shift in semitones
  (clamped |x| < 12) and speed factor as a percentage (clamped 0 < x < 3).
- **`ValueSpinner.tsx`** — generic +/− stepper over an allowed-value list with a
  center text field; falls back to free text if the value isn't in the list.
  (Known rough edge: every keystroke fires `onChange`.)
- **`KeyField.tsx`** — musical-key editor/display implementing the `StandardForm`
  field-component contract: parses `([A-G])([#b]?)(m?)` into letter + sharp/flat +
  minor; displays `#`→♯, `b`→♭.

### 9.2 Sheet music (`components/sheet`, `song/ViewSongSheet.tsx`)

- **`OpenSheetMusicDisplay.tsx`** — class-component wrapper (adapted from the
  official react-opensheetmusicdisplay wrapper) around OSMD: on mount creates an
  `OSMD(div, { autoResize, pageBackgroundColor, drawingParameters:'default' })`,
  loads `sheetUrl`, sets zoom, renders, then calls `onRender(osmd)`;
  `componentDidUpdate` reloads on url/zoom change. (Gotcha: a post-load
  `sleep(1000)` is not awaited.)
- **`SheetMusicViewer.tsx`** — wraps the OSMD component and overlays interactive
  measure boxes computed from `osmd.GraphicSheet.MusicPages[0].MusicSystems[*]
  .GraphicalMeasures`, converting OSMD coordinates to pixels with an empirical
  scale. Supports `highlightedMeasureNum` (scrolls into view) and
  `onClickMeasure` (hit-tests click coordinates against the boxes). Reads
  zoom/background from `SheetMusicViewerContext`.
- **`SheetMusicViewerContext.tsx`** — `{ zoom, autoResize, background }`
  (default zoom 1.0).
- **`ViewSongSheet.tsx`** — the `data/notation` page. Upload/replace via
  `uploadNotation(file)` (then `reload()`); delete via `deleteNotation()` behind a
  confirm. Renders `SheetMusicViewer` when `song.notationUrl` exists.

### 9.3 Timed-data editors (`components/timeddata`)

- **`EditMeasures.tsx`** (`data/measures`) — edits measure times for the shared
  `ALL` part, loaded from `asyncData.text.getPart('ALL')['MEASURES']`. In edit
  mode the user stamps the current play position (via the Bookmark action or the
  M key) with `nextMeasureNum` (auto-incrementing); a left table lists
  (time, measure#, delete); the right panel is the `SheetMusicViewer` highlighting
  the next measure and letting the user click a measure to set `nextMeasureNum`.
  Requires notation to enable Save/Edit/Clear. Save →
  `songClient.part('ALL').putText('MEASURES', ...)` → `reloadAsyncData('text')`.
  (Gotcha: `handleMark` mutates the array in place before `setState`.)
- **`EditBookmarks.tsx`** (`data/bookmarks`) — per-part bookmarks plus a shared
  `ALL` set, loaded from `asyncData.text.getType('BOOKMARKS')`. A part `Select`
  (All Parts + `song.parts`) chooses the editable set; shared bookmarks appear
  merged read-only, sorted by time. Mark adds `{ t: playPositionMs, v: "" }`;
  descriptions editable; per-row delete. Save →
  `songClient.putText(TimedTextData.forType('BOOKMARKS', bookmarks))` →
  `reloadAsyncData('text')`. Requires `song.mediaUrl` to load; shares the
  `AudioPlayer`.

## 10. Shared infrastructure and cross-cutting concerns

- **`MainLayout.tsx`** — app shell. Calls Clerk `useAuth()` and publishes
  `{ getToken, userId }` into `AuthContext.Provider` (the Clerk→HTTP bridge).
  Header: `TTrackIcon`, "TTrack Manager" title, and Clerk `SignInButton`
  (signed-out) / `UserButton` (signed-in). Renders `<Outlet/>`.
- **`common/ProtectedContent.tsx`** — guards the `/songs` subtree with Clerk
  `<Protect fallback={<RedirectToSignIn/>}>` (a commented bypass line exists for
  local dev).
- **`Welcome.tsx`** — public landing with Clerk `<SignIn fallbackRedirectUrl=
  '/songs'/>`.
- **`common/PageContainer.tsx`** — page scaffold: breadcrumbs, title,
  right-aligned `actions`, children.
- **`common/StandardForm.tsx`** — the real generic form engine
  (`StandardForm<T>`). Each `FormFieldSpec` (name, displayName, smSize, optional
  `options` dropdown, optional custom `type` component like `KeyField`) owns its
  own value and calls back `onChange` to mutate the internal bean; the bean does
  **not** flow back into fields (an intentional inversion to avoid update loops).
  Runs `validate(values)` on change; disables Submit unless errors are empty.
  Read-only mode renders display fields plus caller-provided `actionButtons`.
  (The older `components/SongForm.tsx` is superseded by this and unused.)
- **`common/LoadingComponent.tsx`** — runs `loadData()` in an effect, shows a
  spinner while loading, renders an MUI `Alert` on error, else renders children.
  The standard async-load wrapper across pages.
- **`common/TableHeader.tsx`** — styled header/toolbar flex containers.
- **`hooks/useDialogs/*`** — Toolpad-style imperative dialogs. `DialogsProvider`
  keeps a dialog stack; `useDialogs()` → `alert/confirm/prompt/open/close` backed
  by `AlertDialog`/`ConfirmDialog`/`PromptDialog`. `FormDialog.tsx` is an async
  form dialog that exists but isn't wired into a route. Used for delete
  confirmations and clear-all actions.
- **`hooks/useNotifications/*`** — Toolpad-style snackbar queue.
  `useNotifications().show(message, { severity, autoHideDuration, … })` with
  key-dedup; one `Snackbar`/`Alert` shown at a time. Used for success/error
  toasts across create/update/delete/upload/zip flows.
- **`theme/*`** — `AppTheme.tsx` builds a single MUI theme with CSS variables and
  `colorSchemes/typography/shadows/shape` from `themePrimitives.tsx` plus
  data-grid customizations from `dataGrid.tsx` (adapted from the MUI dashboard
  template), wrapping children in `ThemeProvider`.

## 11. Authentication flow (Clerk)

```
ClerkProvider (main.tsx, VITE_CLERK_PUBLISHABLE_KEY, dark)
        │
        ▼
MainLayout: useAuth() ─▶ AuthContext.Provider { getToken, userId }
        │                         │
        │                         ▼
ProtectedContent: <Protect>   useBackend(): axios interceptor
  gate on /songs              sets Authorization: Bearer <getToken()>
```

`Welcome.tsx` handles signed-out entry (redirect to `/songs`). Local development
uses the same Clerk `pk_test` publishable key as production; the only
environment difference is `VITE_BACKEND_URL` (localhost in `.env.local`). The
backend additionally auto-authenticates localhost requests with an admin
identity, so a developer running both locally is authenticated end to end.

## 12. Build, test, and deployment

- **Scripts** (`package.json`): `dev` (Vite, port 5173), `build` (Vite →
  `build/`), `preview`, `type-check` (`tsc --noEmit`), `test` (`vitest run`),
  `test:watch`. Node ≥ 20.
- **Tests** (`vitest.config.ts`): jsdom env, globals on, `passWithNoTests`, setup
  `src/setupTests.ts` (jest-dom), excludes `holding/**`, inlines
  `@mui/x-data-grid` / `@mui/material` for their ESM CSS. There are no real unit
  tests in `src/` (only the excluded `holding/BookmarksEditor.test.tsx`).
- **CI** (`.github/workflows/ci-tests.yml`): on push/PR to `main`, Node 20 →
  `npm ci` → `npm run type-check` → `npm test -- --run`.
- **Deploy** (`.github/workflows/azure-static-web-apps-kind-meadow-09b72ab1e.yml`):
  Azure Static Web Apps CI/CD on push/PR to `main`, using OIDC and
  `Azure/static-web-apps-deploy@v1` with `app_location: "/"`,
  `output_location: "/build"`, `env CI: false`; a separate job closes the SWA
  preview environment when a PR closes.
- **SWA runtime** (`staticwebapp.config.json`): SPA fallback rewrite to
  `/index.html` (excluding `/api/*`, `/static/*`); 401 → redirect `/` with 200.
  `swa-cli.config.json` wires the local SWA CLI (build via `npm run build`, serve
  from `build`, dev server `http://localhost:5173`).
- **Environment variables:** `VITE_BACKEND_URL`, `VITE_CLERK_PUBLISHABLE_KEY`
  (plus `AZURE_SUBSCRIPTION_ID`/`AZURE_TENANT_ID` present but unused at runtime).
  `.env`/`.env.local` are committed and contain a Clerk `pk_test` publishable key
  (public by design) and Azure IDs — no secret keys.

## 13. Cross-cutting notes and risks (for future changes)

- **Stale docs:** `README.md` and `.github/copilot-instructions.md` describe a
  Create React App layout (`src/index.tsx`, `src/data/songs.tsx`, `validateSong`,
  port 3000) that no longer exists. The app is Vite-based with its data layer in
  `src/backend/useBackend.ts` and an empty `src/data/`. Treat the source as
  authoritative.
- **No-op validation** on the song create/edit forms (`validate={() => ({})}`).
- **Song-list Delete is a stub** (`alert`); working delete is on the detail page.
- **Part deletion disabled** in `TrackList` for parts (SCRUM-38 backlog).
- **`reloadAsyncData` argument ignored** in the outlet-context wiring — it always
  reloads parts, mixes, and text.
- **axios client not memoized** — a new client (and interceptor) is created on
  every `useBackend()` call.
- **`getTask` 404 branch is dead** (axios rejects on 404); **`waitForTask`** can
  loop forever if a task never ends.
- **In-place array mutation** in some editors before `setState` (e.g.
  `EditMeasures.handleMark`).
- **Unused/parked code:** `App.tsx`, `SongForm.tsx`, `holding/BookmarksEditor.*`,
  and the `react-player` dependency; the `data/lyrics` route is commented out.
- **`strict` TypeScript is off** and `@types/react` is v18 against React v19 —
  worth tightening before relying on stronger type guarantees.
- See `TODO.md` for the owner's planned functionality, UI improvements, and
  refactors.
