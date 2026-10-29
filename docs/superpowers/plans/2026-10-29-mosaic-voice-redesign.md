# Mosaic Voice Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the browser phone as Mosaic Voice (brand, fonts, palette, four screens, login with server and domain fields) without changing SIP behaviour.

**Architecture:** The SIP layer (`src/sip/`) stays as it is apart from two additive changes: config defaults for the Mosaic edge, and a `remoteUri` field on `CallInfo`. Material UI is removed; one stylesheet of CSS custom properties replaces it. `Phone.tsx` keeps all state and every call into `SipClient`, and renders one of three presentational screens (`Login`, `Dialer`, `CallScreen`) built from small shared pieces (`Brand`, `StatusPill`, `Keypad`, `icons`). Pure helpers (`numberSize`, `account`) carry the testable logic the screens need.

**Tech Stack:** React 18, TypeScript, Vite 8, Vitest 5, SIP.js 0.21, plain CSS, Google Fonts (Inter, Playfair Display, JetBrains Mono).

**Spec:** `docs/superpowers/specs/2026-10-29-mosaic-voice-redesign-design.md`. Mockups: https://claude.ai/artifact/CiHmn8eKhbpTWzX4Wuyti6 (artboards: Brand lockup, Login, Dialer (registered), Incoming call, In call). The artboard HTML is the source for exact sizes and SVG paths.

## Global Constraints

- Node 20.19+. Install packages with `npx npm@latest install …` (npm 11.4.2 crashes; see CLAUDE.md).
- `npm test`, `npm run typecheck`, `npm run build` must each exit 0 at the end of every task. Check exit codes, never through a pipe.
- No new runtime dependencies. No emoji; all icons are inline SVG.
- `src/sip/SipClient.ts` behaviour does not change. The only edit is the additive `remoteUri` field (Task 2). The fail2ban guard and `maxSimultaneousSessions: 1` stay.
- `VITE_*` values are built into the bundle; the SIP password is never read from env or stored.
- Fonts: Inter 300/400/500/600, Playfair Display italic 400, JetBrains Mono 400/500, from Google Fonts with the fallback stacks in the spec.
- Tokens, exactly as the spec lists them: `--ink #1D1D1F`, `--graphite #424245`, `--slate #6E6E73`, `--silver #86868B`, `--line #D2D2D7`, `--hair #E5E5EA`, `--mist #F5F5F7`, `--snow #FAFAFA`, `--white #FFFFFF`, `--accent #0071E3`, `--accent-deep #0050B3`, `--accent-soft #9DD3FF`, `--emerald #1D9367`, `--amber #B25E09`, `--crimson #A4234A`.
- Touch targets at least 44 px. Real `<button>`, `<input>` with `<label>`, `aria-label` on icon-only buttons, decorative SVG `aria-hidden="true"`.
- Commit messages are plain sentences in the repo's existing style, ending with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. A full SIP URI pasted into the number field (`sip:2001@test.mosaicvoice.net`, 28 characters) must render at 20 px on one line, never wrap. Test in Task 3 (`numberFontSize`).
2. Domain left blank on the login form: the realm must fall back to the server's host name, so `line42` on server `pbx.example.com` registers as `sip:line42@pbx.example.com`. Test in Task 3 (`resolveAccount`).
3. Server typed as `https://pbx.example.com:8443/` must yield `wss://pbx.example.com:8443/api/asterisk/ws`. Test in Task 3 (`resolveAccount`).
4. A whitespace-only username or empty password must leave the Login button disabled. Test in Task 3 (`isComplete`).
5. An incoming call with no display name must show the user part as the name and `user@host` beneath it, not the same string twice. Test in Task 2 (`remoteUri` with an empty display name).

---

### Task 1: Config defaults for the Mosaic edge

**Files:**
- Modify: `src/sip/config.ts`
- Test: `src/sip/config.test.ts`

**Interfaces:**
- Produces: `loadConfig(env: Env): PhoneConfig` unchanged in signature; with no env it returns `wsUrl: 'wss://sip.mosaicvoice.net/api/asterisk/ws'` and `domain: 'sip.mosaicvoice.net'`. Exports `DEFAULT_HOST = 'sip.mosaicvoice.net'`.

- [ ] **Step 1: Replace the "leaves everything blank without a host" test**

```ts
it('defaults to the Mosaic Voice edge without a host', () => {
  expect(loadConfig({})).toMatchObject({
    wsUrl: 'wss://sip.mosaicvoice.net/api/asterisk/ws',
    domain: 'sip.mosaicvoice.net',
  });
});

it('still lets VITE_WAZO_HOST point at a plain Wazo', () => {
  expect(loadConfig({ VITE_WAZO_HOST: 'wazo.example.com' })).toMatchObject({
    wsUrl: 'wss://wazo.example.com/api/asterisk/ws',
    domain: 'wazo.example.com',
  });
});
```

- [ ] **Step 2: Run the config tests and confirm the first new test fails**

Run: `npx vitest run src/sip/config.test.ts`
Expected: 1 failed, `wsUrl` is `''`.

- [ ] **Step 3: Implement the default in `loadConfig`**

Export `const DEFAULT_HOST = 'sip.mosaicvoice.net'`. In `loadConfig`, `const host = env.VITE_WAZO_HOST?.trim() || DEFAULT_HOST;` then `wsUrl: env.VITE_SIP_WS_URL?.trim() || wazoWebSocketUrl(host)` and `domain: env.VITE_SIP_DOMAIN?.trim() || hostOf(host)`. Update the file's header comment to say the edge is the default.

- [ ] **Step 4: Run the full suite and typecheck**

Run: `npx vitest run` then `npx tsc --noEmit`
Expected: all pass, exit 0 each.

- [ ] **Step 5: Commit**

```bash
git add src/sip/config.ts src/sip/config.test.ts
git commit -m "Default the phone to the Mosaic Voice edge when no host is configured"
```

---

### Task 2: `remoteUri` on `CallInfo`

**Files:**
- Modify: `src/sip/SipClient.ts` (interface `CallInfo`, `onCallCreated`, `remoteName`)
- Test: `src/sip/SipClient.test.ts`

**Interfaces:**
- Produces: `CallInfo.remoteUri?: string`, the remote identity's `user@host`, set together with `remote` in `onCallCreated` and cleared with `IDLE_CALL`.

- [ ] **Step 1: Extend the fake session and add assertions**

In `fakeSession(displayName, user)` give the URI a `host: 'wazo.example.com'`. In "tracks an incoming call…", change the first assertion to:

```ts
expect(client.getState().call).toMatchObject({
  status: 'incoming', remote: 'Alice', remoteUri: '200@wazo.example.com',
});
```

Add a test for a caller without a display name:

```ts
it('reports the user part as the name when the caller has no display name', () => {
  manager().delegate.onCallCreated(fakeSession('', '300'));
  expect(client.getState().call).toMatchObject({ remote: '300', remoteUri: '300@wazo.example.com' });
});
```

- [ ] **Step 2: Run the SIP tests and confirm the two fail on `remoteUri`**

Run: `npx vitest run src/sip/SipClient.test.ts`
Expected: 2 failed, `remoteUri` undefined.

- [ ] **Step 3: Implement**

Add `remoteUri?: string` to `CallInfo` with a doc comment. Add `function remoteUri(session: Session): string` returning `` `${uri.user}@${uri.host}` `` from `session.remoteIdentity.uri`. In `onCallCreated` set `remoteUri: remoteUri(session)` beside `remote`.

- [ ] **Step 4: Run the full suite and typecheck**

Run: `npx vitest run` then `npx tsc --noEmit`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/sip/SipClient.ts src/sip/SipClient.test.ts
git commit -m "Publish the remote party's user@host alongside its display name"
```

---

### Task 3: Pure UI helpers

**Files:**
- Create: `src/components/numberSize.ts`, `src/components/account.ts`
- Test: `src/components/numberSize.test.ts`, `src/components/account.test.ts`

**Interfaces:**
- Produces:
  - `numberFontSize(value: string): number` returning 36 for up to 12 characters, 30 up to 16, 24 up to 22, else 20.
  - `interface AccountForm { wsUrl: string; domain: string; username: string; password: string }`
  - `resolveAccount(form: AccountForm): SipAccount` (from `../sip/SipClient`): `wsUrl = wazoWebSocketUrl(form.wsUrl)`, `domain = form.domain.trim() || hostOf(wsUrl)`, `username` trimmed, `password` as typed.
  - `isComplete(form: AccountForm): boolean`: `wsUrl`, `username` non-blank after trim and `password` non-empty.
  - `STORAGE_KEY = 'sipphone.account'`, `savedAccount(defaults: PhoneConfig): AccountForm`, `saveAccount(form: AccountForm): void` moved here from `Phone.tsx` unchanged in behaviour (password never saved).

- [ ] **Step 1: Write `numberSize.test.ts`**

```ts
it.each([
  ['', 36], ['226 555 0142', 36], ['+1 226 555 0142', 30],
  ['011 44 20 7946 0958', 24], ['sip:2001@test.mosaicvoice.net', 20],
])('%s renders at %ipx', (value, px) => expect(numberFontSize(value)).toBe(px));
```

- [ ] **Step 2: Write `account.test.ts`**

```ts
it('derives the WebSocket URL and keeps a port', () => {
  expect(resolveAccount({ wsUrl: 'https://pbx.example.com:8443/', domain: 'x', username: 'u', password: 'p' }).wsUrl)
    .toBe('wss://pbx.example.com:8443/api/asterisk/ws');
});
it('falls back to the server host when the domain is blank', () => {
  expect(resolveAccount({ wsUrl: 'pbx.example.com', domain: '  ', username: 'line42', password: 'p' }).domain)
    .toBe('pbx.example.com');
});
it('is incomplete with a blank username or empty password', () => {
  const ok = { wsUrl: 'sip.mosaicvoice.net', domain: '', username: 'dave', password: 'p' };
  expect(isComplete(ok)).toBe(true);
  expect(isComplete({ ...ok, username: '   ' })).toBe(false);
  expect(isComplete({ ...ok, password: '' })).toBe(false);
});
```

- [ ] **Step 3: Run both test files and confirm they fail on missing modules**

Run: `npx vitest run src/components`
Expected: 2 files fail, "Cannot find module".

- [ ] **Step 4: Implement `numberSize.ts` and `account.ts` as specified in Interfaces**

`savedAccount`/`saveAccount` wrap `localStorage` in try/catch exactly as `Phone.tsx` does today (lines 80-96); `savedAccount` takes the config so the module has no import-time env read.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npx vitest run` then `npx tsc --noEmit`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/numberSize.ts src/components/numberSize.test.ts src/components/account.ts src/components/account.test.ts
git commit -m "Add the number-size rule and login form helpers"
```

---

### Task 4: Foundation: logo, fonts, stylesheet, brand pieces

**Files:**
- Create: `public/mosaic-logo.png` (copy of `~/dev_projects/mosaic_supabase/mosaic.png`), `src/styles.css`, `src/components/Brand.tsx`, `src/components/StatusPill.tsx`, `src/components/icons.tsx`
- Modify: `index.html`, `src/main.tsx`

**Interfaces:**
- Produces:
  - `Brand({ variant }: { variant: 'stacked' | 'inline' })`: cube + "Mosaic" + "voice". Stacked: cube 88, Mosaic 52 px, voice 49 px, `margin-left: 86px; margin-top: -8px`. Inline: cube 60, both words 38 px on one baseline, 10 px apart, 14 px from the cube.
  - `StatusPill({ registration, label }: { registration: Registration; label: string })`: dot colour emerald for `registered`, silver for `connecting`, crimson for `error`, `--line` otherwise; text "Registered" / "Connecting…" / "Error" / "Not registered" / "Offline"; `label` in mono 11 px slate.
  - `icons.tsx` exports `PhoneIcon` (filled), `HangupIcon` (same path rotated 135°), `MicIcon`, `MicOffIcon`, `PauseIcon`, `PlayIcon`, `KeypadIcon`, `TransferIcon`, `SlidersIcon`, `LogoutIcon`, `BackspaceIcon`, each `(props: { size?: number }) => JSX.Element` with `aria-hidden="true"`. Paths come from the mockup artboards.
  - CSS class names other tasks use: `.app` (page ground), `.phone` (card), `.screen`, `.brand`, `.brand--stacked`, `.brand--inline`, `.pill`, `.pill__dot`, `.icon-btn`, `.field`, `.field__help`, `.btn-primary`, `.alert`, `.number-line`, `.keypad`, `.key`, `.key--compact`, `.action`, `.action--call`, `.action--end`, `.action--disabled`, `.control`, `.control--on`, `.control__label`, `.avatar`, `.eyebrow`, `.dialog`, `.dialog__backdrop`.

- [ ] **Step 1: Copy the logo and update `index.html`**

`cp ~/dev_projects/mosaic_supabase/mosaic.png public/mosaic-logo.png`. In `index.html`: `<title>Mosaic Voice</title>`, `<link rel="icon" href="/mosaic-logo.png">`, and the Google Fonts `<link>` for `Inter:wght@300;400;500;600`, `Playfair+Display:ital,wght@1,400`, `JetBrains+Mono:wght@400;500` with `display=swap`.

- [ ] **Step 2: Write `src/styles.css`**

`:root` with the tokens from Global Constraints plus `--font-body`, `--font-brand`, `--font-mono` from the spec. Base: `body { margin: 0; font-family: var(--font-body); color: var(--ink); background: var(--mist); letter-spacing: -0.003em }`, `button { font: inherit; cursor: pointer }`. Layout: `.app` centres `.phone`; `.phone` is 390 px wide, white, `border: 1px solid var(--hair)`, radius 28, min-height 844 px on wide viewports; at `max-width: 480px` the `.phone` is full-width, no border or radius, `min-height: 100vh`, and `.app` has no padding. `.screen { padding: 24px 24px 36px; display: flex; flex-direction: column; min-height: inherit }`. Focus: inputs get `border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft)`; buttons `outline: 2px solid var(--accent); outline-offset: 2px` on `:focus-visible`. Define every class listed in Interfaces with the sizes the spec gives per screen; the Keypad, Dialer and CallScreen tasks rely on them.

- [ ] **Step 3: Import the stylesheet in `src/main.tsx`** (`import './styles.css';`)

- [ ] **Step 4: Write `Brand.tsx`, `StatusPill.tsx`, `icons.tsx`** as specified in Interfaces. `Brand` uses `<img src="/mosaic-logo.png" alt="Mosaic logo">`.

- [ ] **Step 5: Typecheck and build**

Run: `npx tsc --noEmit` then `npx vite build`
Expected: exit 0 each (the new components are not yet rendered; MUI is still installed).

- [ ] **Step 6: Commit**

```bash
git add public/mosaic-logo.png index.html src/main.tsx src/styles.css src/components/Brand.tsx src/components/StatusPill.tsx src/components/icons.tsx
git commit -m "Add the Mosaic Voice stylesheet, fonts, logo and brand pieces"
```

---

### Task 5: Keypad and Login screens

**Files:**
- Create: `src/components/Keypad.tsx`, `src/components/Login.tsx`

**Interfaces:**
- Consumes: `Brand`, `icons`, `AccountForm`, `isComplete`, `wazoWebSocketUrl` (from `../sip/config`).
- Produces:
  - `Keypad({ onKey, compact, disabled }: { onKey: (key: string) => void; compact?: boolean; disabled?: boolean })`. Keys in order `1 2 3 4 5 6 7 8 9 * 0 #` with letter groups `2 ABC, 3 DEF, 4 GHI, 5 JKL, 6 MNO, 7 PQRS, 8 TUV, 9 WXYZ, 0 +`; 78 px keys (`.key`) or 64 px without letters when `compact` (`.key--compact`). Each key is a `<button type="button">` whose accessible name is the digit.
  - `Login({ form, onChange, onSubmit, connecting, error, canClose, onClose }: { form: AccountForm; onChange: (f: AccountForm) => void; onSubmit: () => void; connecting: boolean; error?: string; canClose: boolean; onClose: () => void })`. Fields in order Username, Password, Server, SIP domain, with the labels, help text, autocomplete values and placeholders the spec gives; the Server help text is `wazoWebSocketUrl(form.wsUrl)`. Submit button text "Login", or "Connecting…" when `connecting`; disabled when `connecting || !isComplete(form)`. Enter in any field calls `onSubmit` when enabled. `canClose` shows a "Close" text button. Footer "SIP over WSS · WebRTC audio".

- [ ] **Step 1: Write `Keypad.tsx`** per Interfaces, using a `const KEYS: [string, string][]` table.

- [ ] **Step 2: Write `Login.tsx`** per Interfaces, with `<Brand variant="stacked" />` at the top, `<h1>Sign in</h1>`, the lede, the `<form onSubmit>` (prevent default), and an `.alert` for `error`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/Keypad.tsx src/components/Login.tsx
git commit -m "Add the keypad and login screen"
```

---

### Task 6: Dialer and call screens

**Files:**
- Create: `src/components/Dialer.tsx`, `src/components/CallScreen.tsx`

**Interfaces:**
- Consumes: `Brand`, `StatusPill`, `Keypad`, `icons`, `numberFontSize`, `formatDuration`, `PhoneState`, `CallInfo`.
- Produces:
  - `Dialer(props)` with `{ state: PhoneState; accountLabel: string; number: string; onNumberChange: (v: string) => void; onCall: () => void; onOpenAccount: () => void; onDisconnect: () => void; error?: string | null; onDismissError: () => void }`. Layout per spec: inline brand row; row with `StatusPill` and two `.icon-btn` (Sliders "Account settings", Logout "Disconnect", the latter disabled when `registration === 'disconnected'`); `.alert` when `error`; the number line: a real `<input inputmode="tel" aria-label="Number">` styled `.number-line` with `style={{ fontSize: numberFontSize(number) }}`, `white-space: nowrap`, and when the text is still wider than the field at 20 px, kept scrolled to the end (a `ref` and `el.scrollLeft = el.scrollWidth` in an effect on `number`; never `direction: rtl`, which reorders a leading `+`), a 36 px spacer, and a Backspace `.icon-btn` shown only when `number` is non-empty; Enter calls `onCall`. Bottom: `<Keypad onKey={k => onNumberChange(number + k)} />` and the `.action.action--call` button (`aria-label="Call"`), disabled with `.action--disabled` when not registered or `number.trim()` is empty.
  - `CallScreen(props)` with `{ state: PhoneState; accountLabel: string; now: number; onAnswer: () => void; onDecline: () => void; onHangup: () => void; onToggleMute: () => void; onToggleHold: () => void; onDtmf: (key: string) => void; onTransfer: (target: string) => Promise<void>; error?: string | null; onDismissError: () => void }`. Branches on `state.call.status`:
    - `dialing`: avatar (first character of `remote`), name, status "Calling…" in slate, Hang up only.
    - `incoming`: eyebrow "Incoming call", 136 px `.avatar` with the two rings, name, `remoteUri` rewritten as `user · host` in mono, Decline and Answer with labels.
    - `active`: 112 px avatar, name, status row (emerald "In call" + mono timer `formatDuration(now - answeredAt)`, or amber "On hold" when `held`), controls Mute / Hold / Keypad / Transfer as `.control` with `.control--on` for muted and held, Hang up. Local state: `keypadOpen` (hides the avatar, swaps controls for `<Keypad compact onKey>` with a mono line of tones sent and a "Hide keypad" text button), `tones: string`, `transferOpen`, `transferTarget`. The transfer `.dialog` has label "Transfer to", one input, Cancel and Transfer buttons; Enter submits; it closes after `onTransfer` resolves.

- [ ] **Step 1: Write `Dialer.tsx`** per Interfaces.

- [ ] **Step 2: Write `CallScreen.tsx`** per Interfaces.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/Dialer.tsx src/components/CallScreen.tsx
git commit -m "Add the dialer and call screens"
```

---

### Task 7: Wire the screens into `Phone.tsx` and `App.tsx`

**Files:**
- Modify: `src/components/Phone.tsx` (rewrite), `src/App.tsx` (rewrite)

**Interfaces:**
- Consumes: everything above. `SipClient` methods unchanged: `connect`, `disconnect`, `call`, `answer`, `decline`, `hangup`, `toggleHold`, `toggleMute`, `sendDtmf`, `transfer`.
- Produces: `App` renders `<div className="app"><div className="phone"><Phone /></div></div>` with no MUI imports. `Phone` owns: `client` (as today), `state`, `form: AccountForm` (from `savedAccount(config)`), `loginOpen` (initially true, set false on `registered`, set true by `onOpenAccount`), `number`, `actionError`, `now` (interval while `active`, reset on entry). The `run()` wrapper stays. `handleConnect` builds `resolveAccount(form)`, saves it with `saveAccount`, calls `client.connect`. Render: `loginOpen ? <Login …/> : state.call.status === 'idle' ? <Dialer …/> : <CallScreen …/>`. `accountLabel` is `` `${username}@${domain}` `` of the resolved account. Registration errors are passed to `Login` as `error` when open, and to `Dialer`/`CallScreen` as `error` (together with `actionError`) when closed.

- [ ] **Step 1: Rewrite `App.tsx`** per Interfaces (no theme, no MUI).

- [ ] **Step 2: Rewrite `Phone.tsx`** per Interfaces. Keep the `beforeunload` disconnect effect and the `subscribe` effect from the current file.

- [ ] **Step 3: Test, typecheck, build**

Run: `npx vitest run`, `npx tsc --noEmit`, `npx vite build`
Expected: exit 0 each.

- [ ] **Step 4: Visual check against the mockups**

Run: `npm run dev`, open http://localhost:5173 at a 390 px wide viewport and at desktop width. Compare Login, Dialer (after a successful registration, or by temporarily pressing Close with the dev server if no line is available) against the artboards: lockup sizes, pill, key sizes and letters, call button, field order and copy. Note any mismatch and fix it in `styles.css` or the component before committing. Without a WebRTC line only Login and the unregistered Dialer can be seen; say so in the task report.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/Phone.tsx src/styles.css
git commit -m "Render the Mosaic Voice screens"
```

---

### Task 8: Remove Material UI

**Files:**
- Modify: `package.json`, `package-lock.json`
- Delete: nothing else; verify no imports remain.

- [ ] **Step 1: Confirm nothing imports MUI or Emotion**

Run: `grep -rn "@mui\|@emotion" src`
Expected: no output.

- [ ] **Step 2: Uninstall**

Run: `npx npm@latest uninstall @mui/material @mui/icons-material @emotion/react @emotion/styled`
Expected: exit 0; `package.json` lists none of the four.

- [ ] **Step 3: Test, typecheck, build, and check the bundle**

Run: `npx vitest run`, `npx tsc --noEmit`, `npx vite build`, then `grep -l "emotion\|MuiButton" dist/assets/*.js`
Expected: first three exit 0; the grep prints nothing.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "Drop Material UI and Emotion"
```

---

### Task 9: Documentation

**Files:**
- Modify: `README.md`, `CLAUDE.md`, `.env.example`

- [ ] **Step 1: Update `README.md`**

Title "Mosaic Voice phone". Say it defaults to the Mosaic Voice edge (`wss://sip.mosaicvoice.net/api/asterisk/ws`, realm `sip.mosaicvoice.net`) and still works against any Wazo by setting `VITE_WAZO_HOST` or typing a server on the login page. Describe the login fields (Username, Password, Server, SIP domain). Replace the Layout section with the new component files. Remove the Material UI mention and the gradient origin note's claim about the theme.

- [ ] **Step 2: Update `CLAUDE.md`**

Stack line: "React 18 + TypeScript + Vite, plain CSS (`src/styles.css`), SIP.js 0.21 over WSS." In "How the code is split", list `Phone.tsx` (state and client calls), `Login.tsx`, `Dialer.tsx`, `CallScreen.tsx`, `Keypad.tsx`, `Brand.tsx`, `StatusPill.tsx`, `icons.tsx`, `account.ts`, `numberSize.ts`, `duration.ts`. Keep every rule.

- [ ] **Step 3: Update `.env.example`**

Explain that nothing is required: the edge and realm default to `sip.mosaicvoice.net`; `VITE_WAZO_HOST` points at a plain Wazo; the other overrides stay as they are.

- [ ] **Step 4: Commit**

```bash
git add README.md CLAUDE.md .env.example
git commit -m "Document the Mosaic Voice defaults and the new screen files"
```
