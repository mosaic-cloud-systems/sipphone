# sipphone: browser SIP phone for Wazo

React 18 + TypeScript + Vite, Material UI 5, SIP.js 0.21 over WSS. Used to test
SIP and WebRTC against a Wazo PBX. Read README.md for setup and scope.

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
- `src/sip/config.ts` turns `VITE_*` settings into a `PhoneConfig`. The env
  keys are declared in `src/vite-env.d.ts`.
- `src/components/Phone.tsx` renders `PhoneState` and calls `SipClient`
  methods. No SIP logic in the UI.

## Rules

- Never read the SIP password from env or save it: `VITE_*` values are built
  into the shipped JavaScript. It is typed into the sign-in dialog only.
- After a rejected REGISTER the client stops instead of letting SessionManager
  retry every few seconds, which would trip Wazo's fail2ban on a bad password.
  Keep that behaviour.
- Wazo specifics: WebSocket at `wss://<host>/api/asterisk/ws`; credentials are
  the line's SIP username/password; the line needs Wazo's WebRTC settings.

## Testing limits

Unit tests cover the client's state handling and config, not real calls. A real
call needs a WebRTC-enabled Wazo line and a browser with a microphone; say so
when reporting results instead of claiming a feature works end to end.
