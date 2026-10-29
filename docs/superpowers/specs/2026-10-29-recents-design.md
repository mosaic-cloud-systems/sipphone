# Recents with redial

Date: 2026-10-29
Mockup: https://claude.ai/artifact/CiHmn8eKhbpTWzX4Wuyti6 (private canvas; artboard "Dialer (Recents tab)")
Builds on: `2026-10-29-mosaic-voice-redesign-design.md`

## Intent

Give the phone a list of past calls that the user can call back with one tap.
Every softphone and business phone app surveyed (Bria, Zoiper, Linphone,
MicroSIP, Wazo's app, 3CX, Zoom Phone, RingCentral, Aircall, Dialpad) has
one; it is the first thing a person looks for after the keypad. Missed calls
are the main reason: the list is how you find out who called while you were
away from the tab, and how you ring them back without retyping.

## Goals

- A **Recents** view on the dialer screen listing the calls made and received
  on this line, newest first, each showing who, which way, when and how long.
- **One tap on a row places the call** to that party while the line is
  registered.
- **Missed calls stand out**: crimson text, and a count badge on the Recents
  tab for missed calls not yet seen.
- The list **survives a reload and a sign-out**, and is kept per account so
  two lines used in the same browser do not mix.
- The view matches its mockup: same type, colours, spacing and controls as the
  rest of the phone.

## Non-goals

- No server-side history. Wazo's call-log service (`wazo-call-logd`) holds
  the authoritative CDRs but needs a `wazo-auth` token that the SIP line
  credentials cannot obtain. That comes with the Mosaic Voice API's
  registration service; see "Later" below.
- No directory lookup. A row shows the display name SIP gave us, else the
  number. Only incoming calls carry a name (from the caller's From header);
  an outgoing row shows the number dialled. Names from `wazo-dird` are a
  separate feature.
- No record of a second incoming call that arrives during a call. The client
  allows one call at a time, so SIP.js answers the second INVITE with 486
  Busy before the phone sees it, and Wazo takes the caller to the line's
  busy destination (voicemail). Recording it needs a hook into SIP.js's
  session manager; it is listed under "Later".
- No grouping of repeated calls, no search, no per-row delete, no details
  page. "Clear" empties the whole list.
- No change to how calls are placed or answered.

## Anti-goals

- A tap that fills the number field instead of calling. Redial is one tap.
- A list that loses the missed call because the tab was in the background
  when it rang. Any call the phone's state saw is recorded, answered or
  not.
- Recording the password or anything else from the login form alongside the
  history.

## What the user sees

Under the status row of the dialer screen sits a segmented control with two
tabs, **Keypad** and **Recents**. Keypad is the screen as it is today. Recents
replaces the number line, keypad and call button with:

- A header line "RECENT CALLS" (small caps, silver) and a **Clear** link
  (accent blue) on the right. Clear removes every entry at once; there is no
  confirmation, since the list is a convenience and refills.
- A scrolling list, newest first. Each row is a button with three parts:
  - a round direction mark: an arrow pointing up-right (green) for outgoing,
    down-left (graphite on mist) for incoming, down-left on a crimson tint
    for missed;
  - name on the first line (the caller's display name on an incoming call
    when there is one, else the number); second line is "Outgoing · 4:12",
    "Incoming · 1003 · 0:58", "Missed · 2263390620", or
    "Outgoing · No answer". The number appears on the second line only when
    the first line is a name;
  - the time on the right: "10:02" for today, "Yesterday", else "Oct 27".
- Missed rows use crimson for the name and the mark.
- The Recents tab carries a crimson badge with the number of missed calls
  since the user last opened the Recents tab. Opening the tab clears it.
- An empty list shows "No calls yet" centred in slate.
- Tapping a row while registered calls the number of that row (the remote
  user part, never the display name). While not registered, rows are
  disabled, like the Call button.
- During a call the dialer is not visible, so the list only changes between
  calls. When the call ends and the dialer returns, the new entry is at the
  top, on whichever tab the user left open.
- The chosen tab is remembered in this browser.

## Behaviour

- One entry is recorded every time a call ends, whatever its outcome:
  outgoing and answered; outgoing and not answered (busy, declined, cancelled,
  failed); incoming and answered; incoming and not answered (declined here,
  rang out, or taken by another device). "Missed" is an incoming call that
  was not answered here.
- An entry holds: a unique id, direction (`inbound`/`outbound`), the remote
  user part (number or extension), the display name when there was one, the
  start time, whether it was answered, and the duration in seconds from answer
  to hang-up (0 when not answered). These names follow Wazo's CDR fields
  (`call_direction`, `source_name`, `start`, `answered`, `duration`) so a
  later server-backed list drops into the same component.
- The list keeps the newest 100 entries.
- Storage is `localStorage`, one key per account
  (`sipphone.recents.<username>@<domain>`), written on each change. The
  "missed calls seen" marker and the chosen tab are stored the same way. All
  reads and writes are wrapped so a blocked store (private window) just means
  an empty list, never an error.
- The SIP client learns nothing new about history. It gains two fields on its
  call state, the call's direction and the time it started, so the container
  can build the entry when the call state returns to idle.

## Acceptance

- Call 8000, talk, hang up: the Recents tab shows "8000", "Outgoing · 0:xx",
  the time, green mark. Tap the row: the phone calls 8000.
- Receive a call from another line and decline it: a crimson "Missed" row
  appears, and the Recents tab shows a badge "1" until the tab is opened.
- Receive a call and answer it: an "Incoming" row with the duration.
- Call a busy or unknown extension: an "Outgoing · No answer" row.
- Reload the page and sign in again: the list is still there. Sign in as a
  different username: the list is empty for that account.
- Clear: the list empties and stays empty after a reload.
- Keyboard: tab through the segmented control and the rows; Enter on a row
  calls it. Screen reader: each row's label reads like "Call Dave Burrito,
  missed call today at 10:02".

## Later (not in this build)

- A second incoming call during a call, recorded as missed. Needs the SIP
  client to observe the session manager's busy rejection.

- Server history from `wazo-call-logd` once the phone can get a Wazo token
  through the Mosaic Voice API. The entry shape above is chosen to match.
- Names from the tenant directory (`wazo-dird`) on rows and on the incoming
  call screen.
- Post-call recap and voicemail list, per the feature review.

## Calls made in this design

- **Local, per-account storage** rather than Wazo CDRs: the only data the
  phone can reach today with SIP credentials. Cost if wrong: a second data
  source later, mitigated by the matching entry shape.
- **Segmented control on the dialer** rather than a separate screen or a
  list squeezed above the keypad: keeps the keypad full size and the screen
  count at three. Cost if wrong: one more tap to reach the list.
- **One tap calls**, as iOS and every surveyed app do. The number can still
  be inspected from the second line before tapping.
- **Missed badge resets when the tab is opened**, not per row seen.
- **100-entry cap**, enough for weeks of use on one line in a browser store.
- **Outgoing rows show the number only.** SIP.js's remote identity on an
  outgoing call is the To header we sent, so there is no name to show
  without parsing Wazo's identity headers; that is directory work, later.
- **A call that arrives while on a call is not recorded** in this build.
  Wazo already routes that caller to the busy destination, and the server
  history will list it later. Cost if wrong: a missed call invisible in the
  phone until then.
