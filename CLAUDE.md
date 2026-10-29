# sipphone: the Mosaic Voice browser phone

React 18 + TypeScript + Vite, plain CSS (`src/styles.css`), SIP.js 0.21 over
WSS. The Mosaic Voice phone; also used to test SIP and WebRTC against any Wazo
PBX. Read README.md for setup and scope. The design and mockup link are in
`docs/superpowers/specs/2026-10-29-mosaic-voice-redesign-design.md`.

## Commands

- `npm test`, `npm run typecheck`, `npm run build`. Check each exit code on its
  own; never judge a run through a pipe like `| tail`.
- `npm run dev` serves on http://localhost:5173.
- npm 11.4.2 (the version on this Mac) crashes adding some packages with
  "Cannot read properties of null (reading 'edgesOut')". Use
  `npx npm@latest install ...` instead.

## How the code is split

- `src/sip/SipClient.ts` is the only file that touches SIP.js. It wraps
  `Web.SessionManager`, keeps one account and at most one call, and publishes a
  `PhoneState` through `subscribe()`. Add SIP features here, with a test in
  `SipClient.test.ts` (it mocks SessionManager and plays Wazo's events).
- `src/sip/config.ts` turns `VITE_*` settings into a `PhoneConfig`, defaulting
  to the Mosaic Voice edge (`sip.mosaicvoice.net`). The env keys are declared
  in `src/vite-env.d.ts`.
- `src/components/Phone.tsx` owns the state and every call into `SipClient`,
  and picks the screen. No SIP logic in the UI.
- Screens are presentational: `Login.tsx`, `Dialer.tsx`, `CallScreen.tsx`
  (calling, incoming, in call, DTMF keypad, transfer dialog). Shared pieces:
  `Keypad.tsx`, `Brand.tsx`, `StatusPill.tsx`, `RecentsList.tsx` (the Recents
  tab on the dialer), `icons.tsx` (inline SVG only).
- Pure helpers with tests: `account.ts` (login form, what is remembered),
  `numberSize.ts` (dialled-number font size), `duration.ts` (call timer),
  `recents.ts` (call history entries, row text, per-account storage; the
  entry fields follow Wazo's CDR so a server list can replace it later).
- `src/styles.css` holds the design tokens copied from mosaic.site and every
  style. No UI library: Material UI was removed in the redesign.

## Rules

- Never read the SIP password from env or save it: `VITE_*` values are built
  into the shipped JavaScript. It is typed into the sign-in dialog only.
- After a rejected REGISTER the client stops instead of letting SessionManager
  retry every few seconds, which would trip Wazo's fail2ban on a bad password.
  Keep that behaviour.
- Wazo specifics: WebSocket at `wss://<host>/api/asterisk/ws`; credentials are
  the line's SIP username/password; the line needs Wazo's WebRTC settings.
  On Mosaic Voice the login is `<ext>@<slug>.mosaicvoice.net`; `account.ts`
  turns it into the shared edge `sip.mosaicvoice.net`, the realm, and the line
  name `<slug>-<ext>` (the naming rule the Mosaic Voice API follows when it
  creates lines). Any other domain is a plain Wazo host. Server and SIP domain
  overrides sit under Advanced on the login page.

## Testing limits

Unit tests cover the client's state handling and config, not real calls. A real
call needs a WebRTC-enabled Wazo line and a browser with a microphone; say so
when reporting results instead of claiming a feature works end to end.
