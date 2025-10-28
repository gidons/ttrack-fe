This repo is a small Create-React-App + TypeScript front-end for a song/track manager.

Keep guidance concise and practical. Focus on edits that follow existing project structure and patterns.

Key facts
- Framework: React (v19) bootstrapped with Create React App. Entry: `src/index.tsx` and `src/App.tsx`.
- Routing: `react-router` is used in `src/index.tsx` with routes under `/songs` (list, view, create, edit).
- UI: Material UI (@mui) components and `@mui/x-data-grid` are used across components (see `src/components/*`).
- Network: `axios` client in `src/data/songs.tsx` targets a backend at `http://localhost:8080`. Endpoints: `/songs`, `/songs/:id`, `/songs/:id/parts`, `/songs/:id/mixes`.
- Types: central domain types and helpers live in `src/types.ts` (Song, Track, helpers like `secondsToHMS`).

Developer workflows and commands
- Start dev server: `npm start` (Create React App). App served at http://localhost:3000.
- Build production bundle: `npm run build` -> `build/` directory.
- Run tests: `npm test` (CRA test runner). Quick type check: `npm run type-check`.
- Linting: project uses CRA default eslint config. No separate lint script.

Important project patterns and conventions
- Data access layer:
  - All backend calls are centralized in `src/data/songs.tsx` using an `axios` client. Prefer adding new endpoints here and using them across components.
  - URL generation: `getDownloadUrl(path)` uses the same `serverUrl` constant — update it if backend host/port changes.

- Component structure and forms:
  - Reusable UI containers: `src/components/PageContainer.tsx` wraps pages with consistent layout and actions.
  - Forms follow a controlled pattern: `SongForm.tsx` receives a `formState`, `onFieldChange`, `onSubmit`, and optional `onReset`. When adding forms, follow the same pattern to keep UIs consistent.
  - Select/inputs: MUI components are used; see `SongForm.tsx` for examples of `TextField`, `Select`, `FormControl` with error handling.

- Hooks/providers:
  - Notifications: `src/hooks/useNotifications/*` provides `NotificationsProvider` and `useNotifications` for ephemeral UI messages.
  - Dialogs: `src/hooks/useDialogs/*` provides confirm/dialog helpers. Wrap new pages in the same providers (already wired in `src/index.tsx`).

- Routing and navigation:
  - Routes are defined in `src/index.tsx`. Use `useNavigate()` from `react-router` to programmatically move between pages (see `src/components/SongList.tsx`).

Common gotchas and patterns to preserve
- Strict TypeScript: prefer typed state and props. Types are defined in `src/types.ts`. Use partials like `Partial<Song>` when editing drafts.
- Data validation: `validateSong` lives in `src/data/songs.tsx`. Use it before sending create/update requests.
- Error handling: components typically set local `error` state and render an MUI `Alert` (see `SongList.tsx`). Follow this pattern when adding async work.

Where to make changes for typical tasks
- Add new API endpoint: update `src/data/songs.tsx` and add a corresponding typed function. Then use it from components.
- Add a new page: create `src/components/MyPage.tsx`, export default, and add a route in `src/index.tsx` under `/songs` or a suitable path. Wrap UI in `PageContainer`.
- Add form field: update `SongForm.tsx` (or create a new form component following its props shape). Use `onFieldChange(name, value)` and `formState.errors` to show validation messages.

Tests and quick validations
- Type check: `npm run type-check` (helpful before PR).
- After edits, run `npm start` to smoke-test UI behaviour; the project uses CRA so rebuilds are automatic on save.

Files to reference when coding
- Routing and providers: `src/index.tsx`
- App shell: `src/App.tsx`, `src/components/PageContainer.tsx`
- Data layer and validation: `src/data/songs.tsx`
- Types and helpers: `src/types.ts`
- Forms and patterns: `src/components/SongForm.tsx`, `src/components/CreateSong.tsx`, `src/components/EditSong.tsx`
- Lists and grids: `src/components/SongList.tsx` (example DataGrid usage)

Examples (copy/paste-ready snippets)
- Call backend from a component (use existing client):
  - import { getPartsForSong } from '../data/songs';
  - const parts = await getPartsForSong(songId);

- Show validation errors in a form following `SongForm`:
  - formState.errors is a Partial<Record<fieldName, string>>. Render helper text with `formErrors.field ?? ' '` to keep layout stable.

Editing guidance for AI agents
- Make minimal, local edits unless otherwise requested. Preserve existing prop shapes and provider usage.
- When adding a new exported function or component, update the relevant barrel or import site (e.g., `src/index.tsx` routes).
- Run quick type-check (`npm run type-check`) after code edits and prefer small focused PRs.

If anything here is missing or unclear, ask for the specific task or file to update and I'll expand examples or add missing integrations.
