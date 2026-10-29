# Mosaic Voice phone

A browser SIP phone for Mosaic Voice, usable against any Wazo PBX. It
registers a line over a secure WebSocket (SIP.js) and makes and takes audio
calls with WebRTC.

## What works

- Register a line, with status shown on screen
- Call an extension or number; cancel while it rings
- Answer or decline incoming calls
- Mute, hold/resume, hang up
- Keypad tones (DTMF) during a call, sent in the RTP stream (RFC 4733)
- Blind transfer
- Optional SIP trace: every SIP message logged to the browser console

Not built yet: attended transfer, conferencing, recording, video, more than one
call at a time, call history.

## Where it connects

With nothing configured the phone talks to the Mosaic Voice edge:

| | Default |
|---|---|
| WebSocket | `wss://sip.mosaicvoice.net/api/asterisk/ws` |
| SIP domain (realm) | `sip.mosaicvoice.net` |

The login page has four fields: **Username** and **Password** (the line's SIP
credentials, not a portal login), **Server** (a host name, or a full `ws://`
or `wss://` URL; a host name becomes `wss://<host>/api/asterisk/ws`), and
**SIP domain** (the realm; blank uses the server's host). Username, server
and domain are remembered in the browser; the password never is.

To point the phone at a plain Wazo instead, type its host as the server, or
set `VITE_WAZO_HOST` in `.env.local` so it is prefilled.

## Wazo setup

- **WebSocket:** Wazo serves SIP over WebSocket at
  `wss://<your-wazo>/api/asterisk/ws`, on by default.
- **Credentials:** use the *line's* SIP username and password (Wazo line, SIP
  settings), not the Wazo user's portal login.
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
| "Registration rejected: 401/403" | Wrong line username or password. The phone stops instead of retrying, so a bad password doesn't trip Wazo's fail2ban. |
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
  sip/config.ts            VITE_* settings and the Mosaic Voice defaults
  components/Phone.tsx     State and every call into SipClient; picks the screen
  components/Login.tsx     Sign-in page
  components/Dialer.tsx    Keypad and number entry when idle
  components/CallScreen.tsx Calling, incoming and in-call screens, DTMF keypad, transfer
  components/Keypad.tsx    The 12 keys, full or compact
  components/Brand.tsx     Mosaic Voice lockup
  components/StatusPill.tsx Registration status
  components/icons.tsx     Inline SVG icons
  components/account.ts    Login form helpers and what is remembered
  components/numberSize.ts Font size for the dialled number
  components/duration.ts   Call timer formatting
  styles.css               Design tokens from mosaic.site and all styles
  App.tsx, main.tsx        Layout frame and entry point
public/mosaic-logo.png     The Mosaic cube, also the favicon
```

## Design

The look follows mosaic.site: Inter for text, JetBrains Mono for addresses
and the timer, Playfair Display italic for "voice", a white ground with the
site's neutral palette and blue accent. The written design and mockup link
are in `docs/superpowers/specs/2026-10-29-mosaic-voice-redesign-design.md`.
