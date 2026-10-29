# Mosaic Voice look and feel for the browser phone

Date: 2026-10-29
Mockups: https://claude.ai/artifact/CiHmn8eKhbpTWzX4Wuyti6 (private canvas; five artboards: brand lockup, Login, Dialer, Incoming call, In call)

## Intent

Restyle the existing Wazo test phone as **Mosaic Voice**, the phone a Mosaic
Voice customer would open in a browser. The SIP layer and its behaviour stay
as they are. The screen gets a new identity taken from the Mosaic site: its
fonts, its neutral palette and blue accent, and the cube logo, plus a new
"voice" wordmark treatment.

Why now: the phone is about to be pointed at the Mosaic Voice edge
(`sip.mosaicvoice.net`) instead of an arbitrary Wazo host, and it should look
like part of that product when it is.

## Goals

- Every screen reads as Mosaic: same type, colours and restraint as mosaic.site.
- Login asks only for what Mosaic Voice needs: username, password, SIP domain
  (defaulting to `sip.mosaicvoice.net`).
- Each screen matches its mockup closely enough that a side-by-side comparison
  shows the same layout, type sizes, colours and controls.
- The dialled number never wraps; it shrinks as it gets longer.
- Keyboard and screen-reader accessible: real buttons, inputs with labels,
  visible focus, labelled icon buttons.

## Non-goals

- No new SIP or call features. Attended transfer, conferencing, history,
  video and multiple calls stay out of scope.
- No login service. Credentials go straight to SIP; there is no account lookup
  and no company name to show.
- No dark mode.
- No change to the config rules: `VITE_*` values are still built into the
  bundle, and the password is still never read from env or stored.

## Anti-goals (what would make this a failure)

- Any change to `src/sip/SipClient.ts` behaviour, including the fail2ban guard
  and the one-call limit. The only edit allowed there is the additive
  `remoteUri` field described under Incoming call; every existing SIP test
  assertion still passes.
- A look that still reads as a Material UI template: gradients, ripples,
  floating-label fields, elevated cards.
- A keypad or action button under 44 px.
- Emoji or raster icons; all icons are inline SVG.

## Constraints

- Stack stays React 18 + TypeScript + Vite + Vitest. Node 20.19+.
- Fonts load from Google Fonts: Inter (300, 400, 500, 600), Playfair Display
  (italic 400), JetBrains Mono (400, 500). Each has a system fallback stack.
- The logo is the Mosaic cube PNG at `~/dev_projects/mosaic_supabase/mosaic.png`
  (500×500, RGBA). Copy it into the repo as `public/mosaic-logo.png`. It is
  also the favicon.
- No new runtime dependencies. Icons are the inline stroke SVG paths used in
  the mockups (Feather-style, 24-unit viewBox, stroke 1.8–2).
- Unit tests cannot render components (no jsdom in the project). Pure helpers
  get tests; the screens are checked by eye against the mockups.

## Decisions made

### Drop Material UI, use plain CSS

Material UI 5, Emotion and the icon package are removed. Styling is one
stylesheet (`src/styles.css`) built on CSS custom properties that copy the
Mosaic site's tokens. The mockups are plain HTML and CSS; implementing them
under MUI means overriding most of what MUI adds. This is the author's call,
made for simplicity; it also removes three dependencies and the theme file.

### Design tokens (from `mosaic-site/index.html`)

```
--ink      #1D1D1F   text
--graphite #424245   secondary text, icon buttons
--slate    #6E6E73   tertiary text, key letters
--silver   #86868B   placeholders, footers
--line     #D2D2D7   input borders
--hair     #E5E5EA   key borders, dividers
--mist     #F5F5F7   pills, icon buttons, page ground on desktop
--snow     #FAFAFA
--white    #FFFFFF   screen ground
--accent   #0071E3   "voice", primary button, focus ring, eyebrow text
--accent-deep #0050B3
--accent-soft #9DD3FF  focus halo, incoming avatar
--emerald  #1D9367   registered dot, call, answer
--crimson  #A4234A   decline, hang up, errors
--font-body 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif
--font-brand 'Playfair Display', Georgia, serif   (italic, "voice" only)
--font-mono 'JetBrains Mono', 'SF Mono', Menlo, monospace
```

Body text is Inter 400 with letter-spacing -0.003em; headings use -0.015 to
-0.022em. Corner radii: inputs 10 px, buttons 12 px, pills 999 px, round
keys and action buttons 50%.

### Brand lockup

Two forms. Both are the cube logo, "Mosaic" in Inter 600 (letter-spacing
-0.02em), and "voice" in Playfair Display italic 400, accent blue.

- **Stacked** (login page, standalone mark): "voice" sits under "Mosaic" at
  about 94% of its size, pulled up so the lines nearly touch, and shifted right
  so the *e* of "voice" ends past the *c* of "Mosaic". Login page sizes: cube
  88 px, "Mosaic" 52 px, "voice" 49 px, left offset 86 px, top offset -8 px.
- **Inline** (header of dialer, incoming and in-call): cube 60 px, then
  "Mosaic" and "voice" on one baseline, both 38 px, 10 px apart, 14 px from the
  cube. The lockup takes its own row at the top of the screen.

### Layout frame

The phone is a 390 px wide column. On a viewport wider than 480 px it is a
white card (radius 28 px, 1 px `--hair` border) centred on a `--mist` page.
At or below 480 px it is full-bleed white. Horizontal padding 24 px (28 px on
login). The column is at least 100vh tall on phones so the bottom actions sit
near the thumb; on desktop the card is 844 px tall.

### Screens

**Login** (mockup "Login"). A full-screen view that covers the phone, driven
by a `loginOpen` flag as today: open on first load, closed automatically when
registration succeeds, reopened by the account button (then a Close link
appears). It is not tied to registration state, so a socket drop during a
call keeps the call screen in front with the status pill showing the error,
and the dialer's "Connecting…" and "Error" pill states are reachable after
the view has closed once. Stacked lockup centred at the top. Heading "Sign in", lede "Use your
line's SIP username and password." Fields in this order: Username (text,
`autocomplete=username`), Password (password, `autocomplete=current-password`,
help text "Never saved. The other fields are remembered in this browser."),
Server (text, monospace, default `sip.mosaicvoice.net`; accepts a host name
or a full `ws://` or `wss://` URL, help text showing the derived WebSocket
URL), SIP domain (text, monospace, default `sip.mosaicvoice.net`). Button
"Login", full width, 52 px, accent blue, white Inter 600. Footer in mono
silver: "SIP over WSS · WebRTC audio". A registration error shows above the
form as a crimson-text alert on a light tint; the button shows "Connecting…"
and is disabled while connecting. Enter in any field submits.

The SIP domain and the WebSocket edge are two different things on Mosaic
Voice: the phase-0 infrastructure plan in `~/dev_projects/mosaic_voice`
registers lines with a per-tenant realm (for example `test.mosaicvoice.net`)
over a WebSocket to the shared edge `wss://sip.mosaicvoice.net/api/asterisk/ws`,
and only the edge host has a certificate. So the WebSocket URL is **not**
derived from the domain field. It comes from the Server field, through
today's `wazoWebSocketUrl` (`wss://<host>/api/asterisk/ws`, or a `ws://` or
`wss://` URL unchanged). The Server field's initial value is the config
`wsUrl` (see Config), which defaults to the Mosaic edge. The domain field is
only the SIP realm (the AOR's host part); its default is the config `domain`.
Username, server and domain persist in localStorage under the existing key;
password never does. An empty domain falls back to the server's host name,
as today.

**Dialer** (mockup "Dialer (registered)"). Inline lockup row. Second row:
status pill left (`--mist`, 999 px; emerald dot, "Registered" 13 px 500, then
`user@domain` in mono 11 px slate), and two 40 px square `--mist` icon
buttons right: account (sliders icon, opens Login) and disconnect (log-out
icon). While connecting the dot is silver and the text "Connecting…"; on
error the dot is crimson and the text "Error". Below: the number line, then
the keypad and call button pushed to the bottom.

Number line: one row, `white-space: nowrap`, centred between a 36 px spacer
and a 36 px backspace button (only visible when non-empty). Inter 300,
letter-spacing -0.01em. Size by length of the displayed string: up to 12
characters 36 px, up to 16 characters 30 px, up to 22 characters 24 px, longer
20 px. Overflow beyond that is clipped on the left so the most recent digits
stay visible. Placeholder "Extension or number" in silver at 20 px when empty.
The field accepts typing from the keyboard (a real `<input>` styled this way,
`inputmode=tel`), Enter dials.

Keypad: 3 × 4 grid, 78 px round keys, white with 1 px `--hair` border, gap
14 px vertical and 22 px horizontal. Digit 28 px Inter 400 ink; under it the
letter group in 10 px 500 slate, letter-spacing 0.12em (2 ABC, 3 DEF, 4 GHI,
5 JKL, 6 MNO, 7 PQRS, 8 TUV, 9 WXYZ, 0 +). Keys 1, * and # have no letters but
keep the same height. Pressed state: `--mist` background.

Call button: 72 px round, emerald, white filled phone icon 28 px, soft
emerald shadow (`0 6px 18px rgba(29,147,103,.28)`). Disabled (not
registered or empty number): `--hair` background, silver icon, no shadow.

**Calling** (no mockup; outbound ringing). Same as In call but the status
line reads "Calling…" in slate with no timer, and only the hang-up button is
shown. The avatar shows the first character of the dialled target.

**Incoming call** (mockup). Inline lockup and status pill as on the dialer,
without the icon buttons. Centre block from 64 px below the pill: eyebrow
"INCOMING CALL" 12 px 500, letter-spacing 0.14em, accent blue; a 136 px round
avatar in `--accent-soft` with the remote name's first character in 54 px 500
`--accent-deep`, ringed by two thin circles (1 px `--accent-soft` at 14 px out,
1 px `--hair` at 30 px out); the remote name 32 px 600; under it the remote
URI's user part and domain in mono 13 px slate ("200 · wazo.example.com").
To make that possible, `CallInfo` gains one additive field, `remoteUri`
(`user@host` of the remote identity), set in `onCallCreated` beside
`remote`. This is the only edit to `SipClient.ts`: no behaviour changes, and
it gets its own assertion in the existing incoming-call test. When the caller
has no display name, `remote` already equals the user part, so the name line
shows "200" and the sub line "200 · wazo.example.com".
Bottom: Decline (crimson) and Answer (emerald), 74 px round, 88 px apart, each
with a 13 px label beneath. The decline icon is the phone icon rotated 135°.

**In call** (mockup). Inline lockup and pill. Centre: 112 px `--mist` avatar
with the initial in 44 px 500 graphite; name 30 px 600; status row with
emerald dot, "In call" 14 px 500 emerald, and the timer in mono 15 px
graphite (`m:ss`, from `formatDuration`). On hold the dot and text turn amber
`#B25E09` and read "On hold". Controls row, 24 px gap: Mute, Hold, Keypad,
Transfer; each a 66 px round `--mist` button with a 24 px stroke icon and a
12 px label under it. Active states: Mute on shows the mic-off icon with an
ink background and white icon; Hold on shows a play icon the same way.
Bottom: Hang up, 74 px crimson, label beneath.

Keypad during a call: pressing Keypad hides the avatar block (name and
status row stay) and replaces the controls row with a compact dial pad: the
same `Keypad` component in a 64 px key variant with 10 px gaps, no letter
groups, so the pad is about 290 px tall and the screen still fits in 844 px.
Above the pad a mono line shows the tones sent so far; a "Hide keypad" text
button under it returns to the controls and the avatar. Each key sends one
DTMF tone through the existing client. This replaces today's behaviour of
reusing the dialer keys for DTMF.

Transfer: pressing Transfer opens a small centred dialog in the same style
(white, radius 16 px, hairline border): label "Transfer to", one text input,
Cancel and Transfer buttons. Enter submits. It is the one modal in the app.

**Errors during a call** (action failures) show as a crimson-text alert
between the status pill and the centre block, dismissable.

### Config

`config.ts` gains two defaults, resolved in this order:

- `wsUrl`: `VITE_SIP_WS_URL`, else `wazoWebSocketUrl(VITE_WAZO_HOST)`, else
  `wss://sip.mosaicvoice.net/api/asterisk/ws`.
- `domain`: `VITE_SIP_DOMAIN`, else `hostOf(VITE_WAZO_HOST)`, else
  `sip.mosaicvoice.net`.

So with no env at all the phone talks to the Mosaic edge, and a plain Wazo
host still works by setting `VITE_WAZO_HOST`. `loadConfig` tests cover both
defaults. `.env.example` and `README.md` are updated to say so and to drop
the server field from the sign-in description.

### Files

- `index.html`: title "Mosaic Voice", favicon link, Google Fonts link.
- `public/mosaic-logo.png`: the cube.
- `src/styles.css`: tokens and all component styles, imported from `main.tsx`.
- `src/App.tsx`: drops the MUI theme; renders `Phone` inside the layout frame.
- `src/components/Phone.tsx`: the screens. May be split into
  `Login.tsx`, `Dialer.tsx`, `CallScreen.tsx`, `Keypad.tsx`, `Brand.tsx`,
  `icons.tsx` at the builder's discretion; `Phone.tsx` keeps the state and
  the client calls so the "no SIP logic in the UI" rule still holds.
- `src/components/numberSize.ts`: the length-to-font-size rule, with a test.
- `src/components/duration.ts`: unchanged.
- `package.json`: remove `@mui/material`, `@mui/icons-material`,
  `@emotion/react`, `@emotion/styled`. Install with `npx npm@latest`
  (see CLAUDE.md).
- `CLAUDE.md` and `README.md`: stack line and layout section updated.

## Left to the builder

- Exact SVG paths (use the mockup files on the canvas as the source).
- Whether to split `Phone.tsx` into the files above or keep one file.
- The pressed and focus styles beyond what is specified: focus is a 3 px
  `--accent-soft` halo on inputs and a 2 px accent outline on buttons.
- Transition and animation: none required; a 120 ms background transition
  on buttons is fine.
- How the login view and phone view swap (conditional render is enough).

## Acceptance

- `npm test`, `npm run typecheck`, `npm run build` all pass; every existing
  SIP test assertion is unchanged (one assertion for `remoteUri` is added).
- Each of the four mocked screens, opened at 390 px wide, matches its artboard
  in layout, sizes, colours and copy.
- A 16-character number fits on one line at 30 px; a 24-character one at
  20 px; neither wraps.
- Tab order on the login page is username, password, domain, Login; every
  icon button has an `aria-label`.
- The bundle contains no MUI or Emotion code.
