# Retrospace

A retrospective workspace with retro items and action items, paginated tables,
filters, voting, comments, owner/status/date pickers, editing dialogs, a timer,
and shared live updates. The app uses the Next.js Pages Router,
React 18, and Atlassian Design System components and tokens.

## Run locally

```sh
npm install
npm run dev
```

The initial HTML includes Atlassian theme styles so browser refresh does not wait
for client-side theme initialization. Theme selection follows the operating system
on the first visit and can be overridden with the theme toggle.

Account identity and sessions use Supabase Auth. Signed-in users open
`/`, a profile dashboard with a create-retro modal and a searchable table
of hosted and attended retrospectives. Guests can create from
`/?create=1` using their name. Creation returns to the dashboard at `/`. The timer uses compact chips with
15 mins selected by default; the legacy `/dashboard` URL redirects to `/`.

Shared boards live at `/retro/[invite_slug]`. Invitation holders join using an
account or, when allowed by the host, a named guest session. Boards reuse the
existing Atlassian board/card/table controls. Reflections, votes, comments,
actions, membership and timers are persisted in Supabase, with database-enforced
permissions. The old fixture controller is retained for isolated legacy code;
it is no longer the signed-in destination or persistence layer.

## Supabase connection

The project includes browser and Pages Router server client helpers plus a
Next.js 16 `src/proxy.ts` entry point for refreshing Supabase Auth cookies.
Configure `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the ignored root `.env.local` file;
`.env.example` shows the variable names. Restart the dev server after changing
environment values. Do not put a service-role or secret key in browser code.

Account flows open in Atlassian modals on `/`, using `?auth=login`,
`?auth=signup`, `?auth=verify-email`, `?auth=forgot-password`, and
`?auth=reset-password`. The old standalone account URLs redirect to the matching
homepage modal. Signup collects full name, email, and password.
Dialogs support Escape, backdrop/close controls, focus return, flow switching,
and browser Back. Password-reset callbacks open the guarded reset modal.

The public homepage uses a split hero with left-side copy and a floating demo,
followed by how-it-works, board features, action examples, FAQs, and footer links.
It supports light/dark themes and reduced motion. A shared app-wide gate blocks
phone-sized viewports with a request to use desktop or iPad. iPads (including
744px-wide iPad mini) keep the desktop layout. Coarse-touch landscape screens at
500px height or less are also blocked. Matching CSS prevents the mobile page from
flashing before hydration; the client then unmounts the hidden application.

The homepage illustration uses explicit read-only variants of the shared board,
column, and card components: three columns with 3/2/2 miniature cards, static
vote/comment counts and no controls, focus targets or scrolling. The connected
workspace uses the interactive variants of these components. Unknown URLs show a custom 404
on supported screens, and the same desktop blocker on phones.
The profile menu shows the signed-in account and supports logout. Workspace
identity is validated on the server; no credentials are passed in page props.

In Supabase **Authentication → URL Configuration**, set your Site URL and allow
`http://localhost:3000/api/auth/callback` and
`http://localhost:3000/api/auth/callback?flow=recovery`, plus their deployment
equivalents (use your actual local port). Configure email delivery before testing
recovery emails. Email confirmation follows the project's provider setting; the
live project currently auto-confirms signup. Enable Confirm email if verification
should be required. Email links use PKCE and should be opened in the same browser
that started signup/recovery. Expired links can be requested again.

The account UI reuses the existing brand, theme control, Atlaskit buttons and
text fields, and design tokens from the [Atlassian Design System](https://atlassian.design/design-system).
## Shared data and permissions

The tracked migrations in `supabase/migrations/` define profiles, retros,
membership, private host keys, items, item votes, comments and comment votes.
They have already been applied to the configured project. For another project,
apply them in timestamp order using your Supabase migration workflow.

Enable **Allow anonymous sign-ins** in Authentication → Sign In / Providers for
guest creation/joining. Guests have authenticated UUID identities; display names
never grant permissions. Their browser session retains history until logout or
browser storage is cleared. Login/signup can securely transfer guest history,
authorship and hosting using a hashed, expiring, single-use proof. Registered
history persists across devices.

Members read only their joined boards. Mutation RPCs check membership and actor
identity in the database; direct table writes are denied. Reflection authors and
the host can edit/delete reflections and their comments. Every member may vote
and comment on reflections. Only the current host can mutate action items,
including owner/status/due date, votes and comments. Other attendees can view them.

Only the current host can reveal a host key. A member claiming it becomes host,
rotates the key atomically, and leaves the previous host as an attendee. Never
share a host key publicly. Ordinary snapshots and Realtime omit host secrets.
The timer starts at creation; hosts can extend it or select No timer.

Each board subscribes to its own revision changes, then fetches a debounced
snapshot. Private presence reports online members. Full-data polling runs only
while disconnected and visible (every 15 seconds); reconnect/focus refreshes the
snapshot. Item/comment versions reject stale edits without discarding the draft.

Supabase advisors flag anonymous-role policies because guest access is intentional;
these policies additionally enforce membership or hosting. Leaked-password
protection remains disabled in the existing Auth settings; enable it using
[Supabase’s password security settings](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
before your production rollout.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

See [the quality audit](docs/code-quality-audit.md) for completed fixes, remaining
production blockers, and verification limits.

## Collaboration verification

`supabase/tests/authorization.sql` runs isolated, rollback-only permission checks
using temporary users and authenticated roles. Run it as the database owner in a
test project or SQL editor. It verifies member isolation, host key rotation,
host-only actions, direct-write denial, stale edit conflicts, votes/comments and
guest history transfer. No rows survive the transaction.

With the app running locally, browser smoke tests use real Supabase data:

```sh
npx playwright install chromium
npm run test:collaboration
npm run test:guest-account
```

These tests create temporary identities and retrospectives. Their generated IDs
are recorded in `.qa/records.json` for scoped cleanup; credentials and host keys
are never logged. Use a dedicated test Supabase project for repeatable QA.
Guest-account QA expects email signup with automatic confirmation. Email delivery
and confirmation/recovery mailbox round trips require a configured owned mailbox
and are not covered by these collaboration tests.

Latest verification: 52 unit tests, typecheck, lint and production build; real
rollback SQL permission checks; two isolated browsers covering guest creation,
invite join, live mutations, presence, host transfer, action permissions and
history; guest-to-account signup/merge and subsequent password login.
