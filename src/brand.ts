// Everything a rebrand touches, in one place. Change these, replace
// public/mosaic-logo.png, the <title> in index.html and the colour tokens at
// the top of src/styles.css, and the phone is yours.

export const BRAND = {
  /** Product name, used in copy. */
  name: 'Mosaic Voice',
  /** The two words of the lockup: the name in Inter, the second word in the brand italic. */
  wordmark: 'Mosaic',
  wordmarkAccent: 'voice',
  /** Served from public/; also the favicon in index.html. */
  logo: '/mosaic-logo.png',
  logoAlt: 'Mosaic logo',
  /** What a login looks like, shown as the username placeholder. */
  loginExample: '1004@company.mosaicvoice.net',
};

/**
 * The server side: the hosted service behind the login rule (see
 * components/account.ts) and the WebSocket path. A login of
 * <ext>@<slug><domainSuffix> connects to the shared edge and registers as
 * <slug>-<ext>. Leave domainSuffix empty to turn the rule off, so every login
 * is user@host against that host.
 */
export const SERVICE = {
  edge: 'sip.mosaicvoice.net',
  domainSuffix: '.mosaicvoice.net',
  /**
   * Where the server accepts SIP over WebSocket, added to a bare host. This
   * is the Asterisk-behind-Wazo path; plain Asterisk uses /ws (port 8089),
   * FreeSWITCH port 7443. A full ws(s):// URL in VITE_SIP_WS_URL bypasses it.
   */
  wsPath: '/api/asterisk/ws',
};
