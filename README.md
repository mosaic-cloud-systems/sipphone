# Wazo Phone

A browser SIP phone for testing against a Wazo PBX. It registers a Wazo line
over a secure WebSocket (SIP.js) and makes and takes audio calls with WebRTC.

## What works

- Register a Wazo line, with status shown on screen
- Call an extension or number; cancel while it rings
- Answer or decline incoming calls
- Mute, hold/resume, hang up
- Keypad tones (DTMF) during a call, sent in the RTP stream (RFC 4733)
- Blind transfer
- Optional SIP trace: every SIP message logged to the browser console

Not built yet: attended transfer, conferencing, recording, video, more than one
call at a time, call history.

## Wazo setup

- **WebSocket:** Wazo serves SIP over WebSocket at
  `wss://<your-wazo>/api/asterisk/ws`, on by default. The sign-in dialog accepts
  just the host name and fills in the rest.
- **Credentials:** use the *line's* SIP username and password (Wazo line, SIP
  settings), not the Wazo user's portal login.
- **WebRTC line:** the line must use Wazo's WebRTC settings (recent Wazo
  versions ship a `webrtc` SIP template; check your version's docs). A line set
  up for a desk phone will register but fail on media.
- **Certificate:** the browser must trust Wazo's TLS certificate. With a
  self-signed certificate, open `https://<your-wazo>/` once and accept it, or
  the WebSocket fails without a useful error.

## Run it

Requires Node 20.19 or newer.

```bash
cp .env.example .env.local   # set VITE_WAZO_HOST
npm install
npm run dev                  # http://localhost:5173
```

Allow microphone access when asked; `localhost` counts as a secure page, so this
works without HTTPS locally. Served from anywhere else, the page needs HTTPS.

Settings live in `.env.local` (see `.env.example`). Vite builds every `VITE_*`
value into the page's JavaScript, so the SIP password is never one of them: you
type it into the sign-in dialog, and it is not saved. The server, domain and
username are remembered in the browser.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Registration rejected: 401/403" | Wrong line username or password. The phone stops instead of retrying, so a bad password doesn't trip Wazo's fail2ban. |
| Stuck on "Connecting…" / WebSocket error | Wrong URL, or the browser doesn't trust Wazo's certificate. |
| Call connects but no audio, or one-way audio | ICE/NAT. Check the line's WebRTC settings; set `VITE_ICE_SERVERS` (and a TURN server if both ends are behind NAT). |
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
  sip/SipClient.ts     SIP layer: one account, one call, on SIP.js's SessionManager
  sip/config.ts        VITE_* settings, Wazo WebSocket URL
  components/Phone.tsx The phone screen (Material UI)
  App.tsx, main.tsx    Theme and entry point
```

## Origin

The screen and theme come from `~/dev_projects/siperb/siperb` (April 2025). Its
SIP layer was rewritten here: the original never registered, and its call,
conference and recording handling didn't match SIP.js's API.
