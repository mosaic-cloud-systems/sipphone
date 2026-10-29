// Phone settings from VITE_* environment variables (see .env.example).
// Vite builds these values into the page's JavaScript, so a SIP password
// never belongs here: the user types it into the sign-in dialog.
// With nothing set, the phone talks to the Mosaic Voice edge.

export interface PhoneConfig {
  wsUrl: string;
  domain: string;
  username: string;
  iceServers: RTCIceServer[];
  traceSip: boolean;
}

type EnvKey =
  | 'VITE_WAZO_HOST'
  | 'VITE_SIP_WS_URL'
  | 'VITE_SIP_DOMAIN'
  | 'VITE_SIP_USERNAME'
  | 'VITE_ICE_SERVERS'
  | 'VITE_TURN_USERNAME'
  | 'VITE_TURN_CREDENTIAL'
  | 'VITE_SIP_TRACE';

export type Env = Partial<Record<EnvKey, string>>;

const DEFAULT_STUN = 'stun:stun.l.google.com:19302';

/** The Mosaic Voice edge: WebSocket host and SIP realm when nothing else is configured. */
export const DEFAULT_HOST = 'sip.mosaicvoice.net';

/** "https://wazo.example.com:443/path" -> "wazo.example.com" */
export function hostOf(value: string): string {
  return value
    .trim()
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '');
}

/**
 * Wazo serves SIP over WebSocket at wss://<host>/api/asterisk/ws.
 * A full ws:// or wss:// URL is returned unchanged.
 */
export function wazoWebSocketUrl(hostOrUrl: string): string {
  const value = hostOrUrl.trim();
  if (/^wss?:\/\//i.test(value)) return value;
  const host = value.replace(/^https?:\/\//i, '').replace(/[/?#].*$/, '');
  return host ? `wss://${host}/api/asterisk/ws` : '';
}

/** Comma-separated stun:/turn: URLs. Unset means Google's public STUN; empty means none. */
export function parseIceServers(
  urls: string | undefined,
  username?: string,
  credential?: string,
): RTCIceServer[] {
  return (urls ?? DEFAULT_STUN)
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) =>
      /^turns?:/i.test(url) && username ? { urls: url, username, credential } : { urls: url },
    );
}

export function loadConfig(env: Env): PhoneConfig {
  const host = env.VITE_WAZO_HOST?.trim() || DEFAULT_HOST;
  return {
    wsUrl: env.VITE_SIP_WS_URL?.trim() || wazoWebSocketUrl(host),
    domain: env.VITE_SIP_DOMAIN?.trim() || hostOf(host),
    username: env.VITE_SIP_USERNAME?.trim() ?? '',
    iceServers: parseIceServers(env.VITE_ICE_SERVERS, env.VITE_TURN_USERNAME, env.VITE_TURN_CREDENTIAL),
    traceSip: env.VITE_SIP_TRACE === 'true',
  };
}
