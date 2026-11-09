# Frontend quality audit — 4 November 2026

Scope: Pages Router startup, theme lifecycle, navigation, retro and action tables,
creation/editing/deletion, votes/comments, pickers, timer/export, shared controls,
persistence, dependency configuration, and the existing checks. This repository
is a frontend proof of concept; there is no BFF, authentication service, database,
or server authorization implementation to audit.

## Fixed in this pass

- **Initial load lacked theme CSS.** `_document.tsx` supplied theme attributes but
  no token styles. `setGlobalTheme()` loaded those styles asynchronously after
  hydration. Until then, CSS declarations using spacing, typography, color, shape,
  and border tokens were invalid, producing the collapsed view in the screenshots.
  The document now embeds both color themes plus spacing, typography, shape, and
  motion styles in its initial response through Atlassian's `getThemeStyles()` API.
- **Theme configuration was duplicated.** The server document and client provider
  now share `theme-config.ts`, including shape and motion attributes.
- **Cross-tab theme updates were incomplete.** Storage changes now apply the theme
  as well as notifying React; unrelated storage events are ignored.
- **Refresh control duplicated across tables.** `WorkTable` now owns pagination,
  summary alignment, and the refresh button. Callers supply only the callback.
- **Fixed action button widths distorted icon gaps.** Removed those widths and
  compensating icon-padding overrides. Atlaskit now controls natural button sizing.
- **Persistence mixed into the board component.** Moved storage reads, fixture
  composition, storage keys, and persisted work-item types into `work-item-store.ts`.
  Startup and in-place refresh reuse the same loaders.
- **Assignee picker ordering and accessible IDs.** Each picker has its own input
  ID. Existing matches precede the optional exact typed-name entry at the bottom
  (requested product behavior); custom names must be validated by the future BFF.
- **Narrow action columns clipped headers.** Reserved enough space for Actions and
  Comments while keeping the remaining width in the item column.

## Existing shared components retained

Both tables use `WorkTable`, `StatusDropdown`, `VoteControl`, `CommentsControl`,
`CommentsSection`, `ItemFields`, and `ItemModal`. Owner and date pickers, modal
parts, user initials, and theme logic are shared. Buttons and icons use Atlaskit;
`UserAvatar` remains a custom initials component, not Atlaskit's Avatar component.

## Remaining findings, in priority order

1. **Production blocker: identity and authorization are fixtures.**
   `work-item-constants.ts`, navigation actions, and the work views use a fixed
   current user. Permission checks run only in the browser. Before production,
   identity, membership, permissions, mutations, and read access must be enforced
   by the BFF. UI permission checks do not provide access control.
2. **Production blocker: data is local to the browser.** JSON fixtures and
   localStorage are the current data source. Refresh re-reads local state, not a
   shared service. There is no multi-user synchronization, request cancellation,
   conflict handling, or server error/retry flow. Centralize the future BFF adapter
   and consume it from feature hooks rather than adding fetch calls to cells.
3. **Persisted data needs runtime schemas.** `work-item-store.ts` catches malformed
   JSON, but TypeScript casts do not validate structurally incorrect JSON. Add
   versioned schemas and migration tests before treating persisted data as trusted.
4. **Placeholder actions remain.** Board Close and Profile have no
   implemented product behavior. Invite copies the current page URL; it does not
   create an invitation or grant membership. These should be implemented or hidden
   according to the agreed product requirements.
5. **Board orchestration remains too large.** `retro-work-view.tsx` still combines
   filters, ordering, dialogs, and board mutations. Split these by responsibility
   into state hooks and feature components incrementally. Avoid creating generic
   abstractions that merely mirror every feature-specific prop.
6. **Coverage is limited.** The existing tests cover color-mode helpers only.
   Add browser regression coverage for hard refresh, theme persistence, pagination,
   create/edit/delete, voting, comments, keyboard navigation, and calendar selection.
7. **Small-screen layout needs a product decision.** Tables enforce a minimum width
   of 980px and scroll below that size. Desktop was inspected at 1440px; mobile
   behavior and assistive-technology navigation have not been comprehensively tested.

## Evidence and limits

- TypeScript and ESLint passed after the changes.
- Existing Vitest suite: 3 tests passed.
- A real initial HTML response contained all six theme style blocks before `<body>`,
  including spacing and radius definitions; no client theme request is needed for
  the initial appearance.
- A fresh headless Chrome session at 1440 × 1000 showed the styled navigation,
  grids, typography, colors, avatars, and controls after a full page load.
- A production build passed during diagnosis. The final changes were checked with
  typecheck/lint and the live dev page; no claim of complete production readiness
  or comprehensive security/accessibility certification is made.

## Account authentication update — 9 November 2026

Supabase Auth now supplies account signup/login/verification/recovery/password
update/logout. `/` selects the homepage or existing sample workspace using
server-validated identity. The profile uses real account name/email. Work-item
storage keys are now namespaced by account, leaving legacy anonymous data
untouched. Public/auth UI shares a navbar, layout, fields and feedback.

The original production findings still apply to retrospective data: fixture
participants and fixed in-board actors, local browser persistence, client-only
item permissions, placeholder Close/invite behavior and no shared database.
Authentication does not establish retrospective membership or ownership.

Verification: typecheck, lint, 36 tests and production build passed. Browser
checks covered public pages at 360px, signup mismatch, mocked recovery success,
unauthenticated reset and invalid callback; no uncaught page errors. Live provider
settings are reachable, email enabled and signup auto-confirmed. Successful
real-account/email-delivery and cross-tab session journeys remain to be exercised
with an owned test mailbox. Next steps: retrospective/membership schema and RLS,
API/data hooks, real actors by stable account ID, then collaboration flows.

## Collaborative retros update — 9 November 2026

This update supersedes the historical fixture/authorization findings for the
active `/` dashboard and `/retro/[slug]` routes. They use Supabase Auth, real
membership and server-enforced mutations; legacy fixture modules remain isolated.
Shared schemas, RLS, private mutation helpers, indexed foreign keys and migration
history are tracked under `supabase/`. Public RPC wrappers are security-invoker;
privileged helpers live in a non-exposed schema with explicit identity checks.

Implemented: guest/account dashboard history, guest create/join, secure one-use
history merge, author/host moderation, votes/comments, host-only actions,
atomic host transfer/key rotation, server deadlines, private online presence,
board-scoped Realtime invalidation and disconnected-only polling. UUID actor
checks replace display-name permissions. Composite parent keys prevent cross-room
votes/comments. Optimistic versions reject stale edits. Existing cards, columns,
tables, navigation controls and Atlaskit dialogs are reused.

Verification: 52 unit tests; typecheck/lint/build; rollback-only SQL authorization
suite; two-browser creation/join/live updates/votes/comments/presence/host transfer/
action denial/history; guest signup merges authorship/hosting/history and revokes
old guest room access; later password login returns to dashboard. Browser runs
had no uncaught page errors. Screenshots of dashboard and connected board were
inspected. Tracked browser smoke scripts reproduce these workflows against a test
project. Desktop-only gate and isolated homepage preview are preserved.

Advisors: anonymous-policy notices are expected for authenticated guest identities
and remain guarded by membership/host predicates. Existing leaked-password
protection is disabled; see
[Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
Email delivery/recovery mailbox round trips, load testing and comprehensive
assistive-technology certification are outside the evidence recorded here.
