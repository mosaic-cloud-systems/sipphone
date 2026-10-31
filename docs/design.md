# Design decisions

The reasoning behind the phone as it is, for anyone changing it.

## Look

The screens follow mosaic.site: Inter for text, JetBrains Mono for addresses
and the call timer, Playfair Display italic for the accent word of the
lockup, a white ground with a neutral grey scale and one blue accent. The
tokens are at the top of `src/styles.css` (ink, graphite, slate, silver,
line, hair, mist, snow, accent, emerald for "go", amber, crimson for "stop"
and missed calls). There is no UI library: every control is a real button or
input with a label, and icons are inline SVG. The phone is one card of 390 by
844 points on a wide screen and full-bleed under 480 points.

Three screens: sign in, the dialer (Keypad and Recents tabs), and the call
screen (ringing, incoming, in call, with the DTMF keypad and the transfer
dialog folded in). A call always wins: an incoming call shows even with the
sign-in page open.

## Sign-in

Two fields. The username is `<ext>@<realm>`; the password is the line's SIP
password and is never stored. The login rule in `src/components/account.ts`
turns the username into a server, a realm and a line name:

- On the hosted service (`SERVICE` in `src/brand.ts`), `1004@dave.<suffix>`
  connects to the shared edge and registers as `dave-1004` on
  `dave.<suffix>`. Line names must be unique across tenants on one Asterisk,
  so the tenant's slug is part of the name. The provisioning side creates
  lines with the same rule, and desk phones use the same name.
- Any other domain is the server itself: `alice@pbx.example.com` registers as
  `alice` at `wss://pbx.example.com` plus the service's WebSocket path.
- Overrides for odd setups live in the env file only. The page stays two
  fields.

A rejected registration (401, 403) stops the client. SIP.js would otherwise
retry every few seconds, and a wrong password would trip the server's lockout.
The error says the username or password was not accepted and that the server
does not say which, because it doesn't: Asterisk answers both the same way.

## Calls

`src/sip/SipClient.ts` is the only file that touches SIP.js. It keeps one
account and at most one call and publishes a plain state object. A second
incoming call during a call is answered 486 Busy by the client itself, since
SIP.js only refuses a call past its session limit. DTMF goes in the RTP
stream (RFC 4733), not SIP INFO, so IVRs hear it.

## Recents

Call history is kept in the browser, per account, newest 100, because SIP
credentials alone cannot read a server's call records. The entry fields
(direction, name, start, answered, duration) follow a typical PBX call record
so a server-backed list can replace the store later without changing the
list. Entries are written from the client's subscriber, outside React's
render cycle, so a call ended by closing the tab is still recorded. Missed
means an incoming call not answered here; the badge counts missed calls since
the Recents tab was last opened.

## Numbers

The dialled number never wraps. Its font size steps down with length and is
then measured against the real width; a number still too wide at the smallest
size is left-aligned and kept scrolled to its end.
