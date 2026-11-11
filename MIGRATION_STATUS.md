# Progresso cloud migration — local preparation

This folder is a working copy of GitHub commit `e16f06e` (November 11, 2026).
The original archive and browser exports were not modified.

## Current status

- The existing screens still read and write browser localStorage. An
  authentication gate and cloud mirror for those keys are connected in the
  working copy. The app opens to its sign-in screen in the local preview.
- The initial schema, multiple habit-tag link migration, and localStorage
  compatibility-table migration were applied to the Supabase project.
- A local Supabase client setup and `.env.example` are present. `.env.local`
  contains the project's URL and browser-safe publishable key and is excluded
  by `.gitignore`.
- Dependencies are installed in this working copy and the lockfile is updated.
- The production build completes. A large JavaScript bundle warning remains;
  it does not block the build.
- The user imported the fresh browser backup. The signed-in app preview showed
  `Synced` and the imported timer tags after the import.
- The fresh browser export is stored separately from the app source.
- The repository includes placeholder Tasks/Goals pages, but no data models
  or persisted records for those features.
- The app is live at `https://progresso-gray.vercel.app` and Supabase Auth is
  configured to return to that site.
- Mobile uses a five-tab bottom navigation, safe-area spacing, larger touch
  targets, and full-width page panels; desktop keeps its existing navigation.
- The email/always-synced banner has been removed. Sync status appears only
  when syncing is pending or the app is offline.
- The timer now redraws once per second and checkpoints every ten seconds;
  dashboard charts no longer refresh every second.
- The dashboard, habits, and notes pages load on demand. The production build
  completes without a large-bundle warning.
- A service worker caches the app and its page bundles for offline opening.
  After a successful sign-in and first cloud load, edits stay on this device
  while offline and are queued for cloud sync when the connection returns.
  First sign-in and the first data load still require internet.
- The iPhone 14 Plus layout and offline behavior still need confirmation on
  the user's physical phone.

## Records represented by the schema

- Timer tags and completed timer sessions, retaining historical tag labels and
  colors even if a tag is later changed or removed.
- Habits, completion dates, reset history, and multiple linked timer tags.
- Note folders and notes, including folder ordering, tags, trash markers, and
  both plain-text and HTML note bodies.
- Per-user preferences, including dark mode, panel sizes, and the additional
  habit-category list found in the browser export.
- A per-user active-timer checkpoint for recovery after a refresh.

Every table has an authenticated owner ID and row-level access rules. The
schema preserves the app's text IDs so an import can retain existing IDs.

## Confirmed account model

This is one personal account used across the user's own devices. There is no
shared workspace, membership, or invitation feature in scope.

## Remaining migration work

1. Check the refreshed layout and offline behavior on the iPhone 14 Plus.
2. Reconfirm sign-in and cloud sync from that device after the new deployment.

Do not put a Supabase secret/service key in browser code. Browser access should
use a public client key with authenticated sessions and the row-level rules
above.
