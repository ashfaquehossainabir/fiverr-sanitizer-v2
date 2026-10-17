# Fiverr Message Sanitizer — Full-Stack Edition

A full-stack rebuild of the original React-only Fiverr Message Sanitizer.
It now has real accounts, a MongoDB-backed workspace of user-created tabs,
and every sanitized message you save is persisted and synced from the
database. The UI is a redesigned, fully responsive dashboard (desktop,
laptop, tablet, and mobile).

## What's included

**Backend** — `server/` (Node.js + Express + MongoDB/Mongoose)
- JWT authentication (register / login / me)
- Password hashing with bcrypt
- Tabs API (create, rename, delete — scoped to the logged-in user)
- Saved-message API, nested under each tab (create, list, delete)
- Account settings API (update name/email, change password, delete account
  — which also cascades and deletes that user's tabs and saved messages)
- Admin API (list users, activate/deactivate, reset a user's password,
  delete a user — see "Admin Dashboard" below)

**Frontend** — `client/` (React 19 + Vite + React Router)
- Login / Register pages
- A dashboard shell: a sidebar of your tabs, a top bar, and the sanitizer
  editor (grammar suggestions, spelling fixes, reserved-keyword warnings,
  Bengali translation, read-aloud, copy — all ported from the original app)
- "Save to Tab" persists the sanitized message to MongoDB under the active
  tab; saved messages are listed below the editor and sync from the database
- Clicking the avatar opens a modal with: edit name/email, change password,
  delete account (danger zone), and Log Out
- An Admin Dashboard (`/admin`, visible only to admin accounts via an
  "Admin" pill next to the avatar) to activate/deactivate users, reset a
  user's password, and delete users
- Fully responsive: the sidebar becomes an off-canvas drawer on tablet/mobile,
  and the admin dashboard reflows from a multi-column grid down to a single
  stacked column on phones

## v8 — Daily-use features

- **Overview** — messages saved this week vs last, a 14-day activity chart, pipeline value, completed value, follow-ups due and upcoming deadlines, plus a one-click **JSON backup** export.
- **Clients & Orders** — track each buyer with status (lead → completed), amount, deadline and follow-up date. Overdue/soon badges, "remind tomorrow / in 3 days" snooze, and a sidebar badge counting follow-ups due today.
- **Quick Reply Templates** — reusable messages with `{{client}}`-style placeholders, a fill-in form, categories, search, usage counts, and 6 starter templates. Using one sends it to the editor (with a "restore my previous text" undo).
- **Message Quality panel** — read time, sentence length and a tone checklist (greeting, politeness, clear next step, sign-off, no shouting).
- **Draft autosave** — unsent text survives refreshes and view switches.
- **Pin, search and client-link saved messages**; global **Search** across every tab.
- **Dark / light mode** on every page (workspace, admin, login, register, verify). Follows your OS until you pick a side, then remembers your choice, syncs across open tabs, and loads with no flash.
- **Organized UI** — slim breadcrumb top bar (no duplicate headings), a compact sidebar (Menu / Tabs with a "+" button), and a workspace split into a *compose* zone and a *review* zone (compliance warnings, message quality and grammar suggestions side by side).
- **Dark theme is neutral deep gray** (`#0F0F11` page, not pure black, no color tint), with fixed contrast on warnings.
- **Shortcuts** — Ctrl/Cmd+Enter copies the sanitized text, Ctrl/Cmd+S saves to the tab.

New API: `/api/clients`, `/api/templates`, `/api/insights`, `/api/export`, `/api/search?q=`, `PUT /api/tabs/:id/messages/:messageId` (pin / link client).
Deleting an account (self-service or by an admin) now also removes that user's templates and clients.
Preview text is HTML-escaped before highlighting.

## v9.3 — Daily-use features & UI polish

- **Command palette** (Ctrl/Cmd+K): jump to any page or tab, insert a template, toggle dark mode, or search every saved message. Press **?** for all shortcuts.
- **Template quick-insert** in the editor: placeholders like `{{client}}`, `{{project}}`, `{{deadline}}` auto-fill from the linked client; only unknown ones are asked for.
- **Paste** button, **Copy & Save** in one click (Ctrl/Cmd+Shift+Enter), and a live character-limit meter.
- **Saved messages**: *Use again* in the editor, *Pinned* filter, and *Export* a tab to .txt.
- **Today strip** on the workspace: follow-ups due, overdue, due in 3 days, open orders.
- **Overview**: monthly earnings goal (stored on your account) with per-day pace, plus a two-way **offer calculator** (fee % is editable).
- **Toasts** replace alert() popups; **bottom navigation** on phones and tablets; template picker becomes a bottom sheet on phones.
- Fixes: loading-screen logo shadow in dark mode; closed mobile sidebar no longer leaks a shadow at the left edge.

New/changed API: `PUT /api/users/goal`; clients get `completedAt`; `/api/insights` returns `pipeline.earnedThisMonth`.

## v9.4 — Bug fixes, organization & touch ergonomics

**Fixed**
- Deadlines/follow-ups no longer shift by a day in some timezones (new `lib/dates.js`); the Today strip, sidebar badge and Overview now use the same "due today or earlier" rule.
- Sanitizer: a URL containing `$` is restored intact. New warning for phone numbers written with spaces/dashes/brackets (these are not auto-masked).
- Grammar: "a user / a unique / a one-time" is no longer flagged as a→an; "can you" is only capitalised at the start of a sentence; the "yesterday" tense fix only touches that sentence; advice-only items show *Dismiss* instead of a do-nothing *Apply*.
- Editor: Read-aloud no longer gets stuck or crashes on browsers without speech support; Translate has a loading state and a *Show English* toggle and ignores stale responses; drafts are stored per account (no leaking between users on a shared browser); a linked client that was completed since is unlinked automatically; Ctrl+S / Ctrl+Enter are ignored while a dialog is open.
- Expired sessions now return you to sign-in instead of showing a cryptic error.
- Dialogs close with Escape; destructive dialogs focus *Cancel*; the tab "⋮" menu closes on outside click; renaming a tab sends one request, Escape cancels.
- "No tabs yet" now has a one-click *Create a General tab* button; saving a message keeps pinned messages on top; starter-template import keeps partial results.

**Improved**
- Clients: status chips show counts, sort by recent / deadline / follow-up / amount, open-pipeline total.
- Sidebar account card pinned to the bottom (opens account settings).
- Touch targets are at least 40px on tablets/phones; filter chips scroll sideways on phones.

## v9.7 — Planner, focus timer & client clocks

- **Planner** (new page, sidebar + phone bottom nav): a to-do list built for freelance days. Quick-add with *Today / Tomorrow / Next week* chips, a date picker, priority (low / normal / high) and an optional client link. Tasks are grouped into **Overdue, Today, Upcoming and No date**, with inline edit, a *Completed* drawer and *Clear completed*. A daily progress bar shows how much of today's list is done.
- **7-day strip**: see how many tasks and client deadlines/follow-ups land on each day; tap a day to focus the list on it.
- **Client radar**: deadlines and follow-ups of your open orders for the next 7 days, next to your tasks.
- **Focus timer** (Pomodoro): 15/3, 25/5 or 50/10 presets, pick the task you are working on, and every finished session is counted on that task. It keeps running while you move between pages (a floating timer pill follows you), survives a refresh, shows the countdown in the browser tab title and plays a soft chime when a session ends.
- **Client time zones**: set a buyer's time zone on the client form; their card shows the local time there and whether it is a considerate hour to reply.
- **Today strip** gains a *Tasks due* chip; the sidebar and bottom nav show a badge for tasks due today or overdue.
- **Shortcuts**: press **N** anywhere to add a task; the command palette can add a task and start/pause the focus timer.
- **Backup** (`/api/export`) now includes your tasks. Deleting a client keeps its tasks (just unlinked); deleting an account removes its tasks.
- **Admin button** is an icon-only shield on tablet and phone widths.

New/changed API: `GET/POST /api/tasks`, `PUT/DELETE /api/tasks/:id`, `DELETE /api/tasks/completed/all`; clients get a `timezone` field.

## v12 — Bug-fix pass

**Fixed**
- Switching tabs quickly could show another tab's saved messages (an older response overwrote the newer one).
- Copy / Save / Copy & Save could use text up to ~0.4s stale; the preview, counters, copy and save now always use the live text.
- Sanitizer: `Review` / `Feedback` at the start of a sentence lost their capital (`check`); case is now preserved. Spelling fixes keep a leading capital too (`Teh` becomes `The`).
- Overview: days, the 14-day chart and "earned this month" were bucketed in server (UTC) time, so work done after midnight local time counted for the wrong day/month. The browser now sends its UTC offset.
- Search: the "Searching..." spinner could stay on forever after clearing the box; a blocked clipboard no longer throws.
- Account dialog: Escape or a backdrop click on the log-out confirmation also closed the account dialog behind it. Admin "Reset password" now closes with Escape.
- The **N** (new task) shortcut no longer fires behind the account dialog.
- Planner: editing a task linked to a client that was since completed no longer shows "No client".
- Sessions: a deactivated or un-approved account is signed out on its next request instead of seeing an error on every action; a network blip or server error on load no longer logs you out.
- Server: malformed ids/dates return 400 instead of 500; non-text login/register/template fields are rejected; `CLIENT_ORIGIN` tolerates a trailing slash.
- Removed dead email-verification code (`VerifyEmail.jsx`, `sendEmail.js`, `emailTemplates.js`): it imported `nodemailer`, which was never a dependency, and was not wired to any route.

**Responsive**
- Short screens no longer scroll for no reason on mobile browsers (`100dvh`); the top bar is tighter on very narrow phones (an admin's bar left almost no room for the title); dialogs scroll on short landscape phones.
- The laptop-only (1025-1439px) hiding of the sidebar Search item is unchanged.

## Prerequisites

- Node.js 18+
- A MongoDB database — either:
  - a local install (`mongod` running on `mongodb://127.0.0.1:27017`), or
  - a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (get a
    connection string from there)

## 1. Backend setup

```bash
cd server
npm install
cp .env.example .env
```

Open `.env` and set:
- `MONGO_URI` — your MongoDB connection string
- `JWT_SECRET` — replace with a long random string (e.g. run
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
  and paste the output)

Start the API server:

```bash
npm run dev      # with nodemon (auto-restart)
# or
npm start
```

The API runs on `http://localhost:5000` by default. Visit
`http://localhost:5000/api/health` to confirm it's up.

## 2. Frontend setup

In a separate terminal:

```bash
cd client
npm install
npm run dev
```

The app runs on `http://localhost:5173`. Vite is already configured to
proxy `/api` requests to `http://localhost:5000`, so the two run together
with no extra config out of the box.

Register a new account, create a tab from the sidebar, sanitize a message,
and click **Save to Tab** — it will now persist in MongoDB and reload the
next time you log in from anywhere.

## Admin Dashboard

The first admin account has to be created from the command line — there's
no self-serve way to become an admin from the UI (by design).

```bash
cd server
# in server/.env, set:
#   ADMIN_EMAIL=you@example.com
#   ADMIN_PASSWORD=a-strong-password
#   ADMIN_NAME=Your Name
npm run seed:admin
```

This creates the account if it doesn't exist yet, or promotes an existing
account with that email to admin. Log in with that account and you'll see
an **Admin** pill next to your avatar — click it (or go to `/admin`) to
reach the dashboard. From there you can:

- **Activate / Deactivate** a user — deactivated users are immediately
  blocked from logging in or using the API (existing sessions are cut off
  on their next request).
- **Reset a user's password** — set a new password directly; no email step.
- **Delete a user** — permanently removes their account along with their
  tabs and saved messages.

An admin can't deactivate or delete their own account from the dashboard,
to avoid getting locked out. To promote additional admins, run
`npm run seed:admin` again with a different `ADMIN_EMAIL`.

## 3. Building for production

```bash
cd client
npm run build     # outputs client/dist
```

Serve `client/dist` with any static host (or have Express serve it) and
point `CLIENT_ORIGIN` in `server/.env` at that production URL. Deploy the
`server/` folder to any Node host (Render, Railway, Fly.io, a VPS, etc.)
alongside your MongoDB instance.

### Deploying frontend and backend to different domains (e.g. Vercel + Render)

If the client and server aren't served from the same domain, the client
needs to know the backend's URL at build time — set this as an environment
variable in your Vercel (or other host) project settings:

- `VITE_API_URL` — the backend's URL including the `/api` prefix, e.g.
  `https://your-backend.onrender.com/api`

And on the backend host (Render), set:

- `CLIENT_ORIGIN` — the frontend's deployed URL, e.g.
  `https://your-frontend.vercel.app`

A `client/vercel.json` is included with a catch-all rewrite so client-side
routes (like `/login`) don't 404 on a hard refresh. After setting the env
var, trigger a redeploy on Vercel (env var changes require a rebuild).

## Project structure

```
fiverr-sanitizer-fullstack/
├── server/
│   ├── config/db.js          MongoDB connection
│   ├── models/               User, Tab, Message, Client, Template, Task, Settings (Mongoose schemas)
│   ├── middleware/           JWT auth guard (+ admin guard), error handler
│   ├── routes/                auth, users (settings), tabs (+ nested messages), admin,
│   │                          clients, templates, tasks, insights/export/search
│   ├── utils/generateToken.js, seedAdmin.js (creates/promotes the first admin)
│   └── index.js               Express app entry point
└── client/
    └── src/
        ├── api/axios.js       axios instance, attaches JWT automatically
        ├── context/AuthContext.jsx
        ├── pages/             Login, Register, Dashboard, AdminDashboard
        ├── components/        Sidebar, TopBar, Editor, SavedMessages,
        │                      AccountModal, ProtectedRoute, AdminRoute,
        │                      ResetPasswordModal, Planner, FocusPill, Clients, ...
        ├── hooks/             useTasks, useFocusTimer, useNow, useTheme, useEscape
        ├── lib/                original sanitizer/grammar/reserved-keyword
        │                      logic, ported unchanged from the source app
        └── styles/index.css    full design system + responsive layout
```

## Notes

- Tokens are stored in `localStorage` and attached to every API request
  automatically.
- Deleting a tab cascades and deletes its saved messages. Deleting your
  account cascades and deletes all of your tabs and saved messages.
- The client-side sanitizing/grammar/translation logic is unchanged from
  the original app — only persistence, auth, and the UI shell are new.

## Bug-fix pass

**Server**
- `.env` is now loaded before any route module runs. Previously "Sign in with Google" always answered *"isn't configured"* when `GOOGLE_CLIENT_ID` came from a `.env` file (it only worked when the host injected real environment variables).
- The server refuses to start without `JWT_SECRET` instead of failing on the first login.
- Google sign-in will not log a different Google identity into an account already linked to another one.
- Unknown `/api/...` paths return 404 (they returned 401 for signed-out callers).
- Wrong-type input (a number where text is expected, etc.) returns a 400 instead of crashing into a 500.
- Template usage counts and the settings record are updated atomically.

**Client**
- Grammar "Apply" no longer produces `Hi John,.` / `Best regards,.`; `??` stays a question mark; `Is` keeps its capital when changed to `Was`.
- Translating no longer shows a stale translation if the text changes (fix applied, template inserted, Clear, Undo) while it is loading.
- A template placeholder that was never filled in (`{{client}}`) now shows a compliance warning, because the sanitizer strips the braces and it would be sent as the plain word "client".
- `{{deadline}}` auto-fill no longer shows the day before for older records in time zones west of UTC.
- A failed load of the Google sign-in script no longer disables the button until the page is reloaded.
- Signing in after being sent to `/login` from another page (e.g. `/admin`) returns you there.
- The loading splash no longer flashes light in dark mode.
- `npm run lint` works (an `eslint.config.js` was missing).
