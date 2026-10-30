# Mosaic Voice phone

An open-source browser SIP phone. It registers a line over a secure WebSocket
(SIP.js) and makes and takes audio calls with WebRTC. Built for Mosaic Voice,
it works against any Wazo PBX, and it is meant to be downloaded and rebranded:
see **Brand it** below.

MIT licensed (the Mosaic name and logo are not; see `LICENSE`).

## Quick start

Requires Node 20.19 or newer.

```bash
git clone https://github.com/mosaic-cloud-systems/sipphone.git
cd sipphone
npm install
npm run dev                  # http://localhost:5173
```

Sign in as `user@your-wazo-host` with the line's SIP password, allow the
microphone, and dial. For a Mosaic Voice account the username is
`<extension>@<company>.mosaicvoice.net`.

## What works

- Register a line, with status shown on screen
- Call an extension or number; cancel while it rings
- Answer or decline incoming calls
- Mute, hold/resume, hang up
- Keypad tones (DTMF) during a call, sent in the RTP stream (RFC 4733)
- Blind transfer
- Recent calls on the dialer, with one-tap redial and a missed-call badge;
  kept in this browser per account (newest 100)
- Optional SIP trace: every SIP message logged to the browser console

Not built yet: attended transfer, conferencing, recording, video, more than one
call at a time, contacts, voicemail.

## Where it connects

With nothing configured the phone talks to the Mosaic Voice edge:

| | Default |
|---|---|
| WebSocket | `wss://sip.mosaicvoice.net/api/asterisk/ws` |
| SIP domain (realm) | `sip.mosaicvoice.net` |

The login page asks for a **Username** and **Password** made for the
softphone. The username is `1004@dave.mosaicvoice.net`: the extension, then the
customer's SIP realm. The phone works the rest out itself: it connects to the
shared edge `sip.mosaicvoice.net` and registers as `dave-1004` (line names must
be unique across customers, so the realm's first label is part of the name).
Any other domain, say `alice@wazo.example.com`, is treated as a plain Wazo host
and registers as `alice` there. For a setup where the WebSocket host and the
realm differ, set the overrides in `.env.local` (see `.env.example`); there
are no fields for them. The username is remembered in this browser; the
password never is.

## Wazo setup

- **WebSocket:** Wazo serves SIP over WebSocket at
  `wss://<your-wazo>/api/asterisk/ws`, on by default.
- **Credentials:** the password is the *line's* SIP password (Wazo line, SIP
  settings), not the Wazo user's portal login. The username typed is
  `<ext>@<realm>`; see the login rule above for what the line is called.
- **WebRTC line:** the line must use Wazo's WebRTC settings (recent Wazo
  versions ship a `webrtc` SIP template; check your version's docs). A line set
  up for a desk phone will register but fail on media. DTMF needs `dtmf_mode`
  `rfc4733` or `auto` on the endpoint.
- **Certificate:** the browser must trust the server's TLS certificate. With a
  self-signed certificate, open `https://<your-wazo>/` once and accept it, or
  the WebSocket fails without a useful error.

## Run it

Requires Node 20.19 or newer.

```bash
npm install
npm run dev                  # http://localhost:5173
```

Allow microphone access when asked; `localhost` counts as a secure page, so this
works without HTTPS locally. Served from anywhere else, the page needs HTTPS.

Optional settings live in `.env.local` (see `.env.example`). Vite builds every
`VITE_*` value into the page's JavaScript, so the SIP password is never one of
them.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Registration rejected: 401/403" | The username or password was not accepted; the server does not say which. The phone stops instead of retrying, so a bad password doesn't trip Wazo's fail2ban. |
| Stuck on "Connecting…" / WebSocket error | Wrong server, or the browser doesn't trust its certificate. |
| Call connects but no audio, or one-way audio | ICE/NAT. Check the line's WebRTC settings; set `VITE_ICE_SERVERS` (and a TURN server if both ends are behind NAT). |
| Keypad tones ignored by an IVR | The endpoint's `dtmf_mode` is not `rfc4733` or `auto`. |
| Need to see the SIP messages | Set `VITE_SIP_TRACE=true` and open the browser console. |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Typecheck and production build into `dist/` |

## Layout

```
src/
  sip/SipClient.ts         SIP layer: one account, one call, on SIP.js's SessionManager
  sip/config.ts            VITE_* settings (overrides only)
  components/Phone.tsx     State and every call into SipClient; picks the screen
  components/Login.tsx     Sign-in page
  components/Dialer.tsx    Keypad and number entry when idle
  components/CallScreen.tsx Calling, incoming and in-call screens, DTMF keypad, transfer
  components/Keypad.tsx    The 12 keys, full or compact
  components/Brand.tsx     Brand lockup (names from src/brand.ts)
  components/StatusPill.tsx Registration status
  components/icons.tsx     Inline SVG icons
  components/account.ts    Login form helpers and what is remembered
  components/RecentsList.tsx Recent calls on the dialer's Recents tab
  components/numberSize.ts Font size for the dialled number
  components/duration.ts   Call timer formatting
  components/recents.ts    Call history entries, row text, per-account storage
  brand.ts                 Names, logo, login example, hosted-service rule
  styles.css               Design tokens from mosaic.site and all styles
  App.tsx, main.tsx        Layout frame and entry point
public/mosaic-logo.png     The Mosaic cube, also the favicon
```

## Brand it

Everything a rebrand touches is in four places:

| What | Where |
|---|---|
| Names, wordmark, logo path, login example, hosted-service rule | `src/brand.ts` |
| The logo and favicon | `public/mosaic-logo.png` (also referenced in `index.html`) |
| Page title | `index.html` |
| Colours and fonts | the tokens at the top of `src/styles.css`, and the Google Fonts link in `index.html` |

Set `SERVICE.domainSuffix` to `''` in `src/brand.ts` if you do not run a
multi-tenant edge; every login is then plain `user@host`. Replace the Mosaic
name and logo before you ship: they are trademarks and not part of the MIT
licence.

## Design

The look follows mosaic.site: Inter for text, JetBrains Mono for addresses
and the timer, Playfair Display italic for "voice", a white ground with the
site's neutral palette and blue accent. The written design and mockup link
are in `docs/superpowers/specs/2026-10-29-mosaic-voice-redesign-design.md`.
