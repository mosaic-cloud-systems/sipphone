import { describe, expect, it } from 'vitest';
import { hostOf, loadConfig, parseIceServers, webSocketUrl } from './config';

describe('webSocketUrl', () => {
  it('builds the WebSocket URL from a host with the service path', () => {
    expect(webSocketUrl('pbx.example.com')).toBe('wss://pbx.example.com/api/asterisk/ws');
  });

  it('accepts an https URL and keeps a port', () => {
    expect(webSocketUrl('https://pbx.example.com:8443/')).toBe(
      'wss://pbx.example.com:8443/api/asterisk/ws',
    );
  });

  it('returns a ws:// or wss:// URL with a path unchanged', () => {
    expect(webSocketUrl('wss://pbx.example.com/ws')).toBe('wss://pbx.example.com/ws');
  });

  it('adds the service path to a wss:// URL that has none', () => {
    // The edge answers 404 at "/" and the browser closes the socket with code 1006.
    expect(webSocketUrl('wss://sip.mosaicvoice.net')).toBe('wss://sip.mosaicvoice.net/api/asterisk/ws');
    expect(webSocketUrl('wss://sip.mosaicvoice.net/')).toBe('wss://sip.mosaicvoice.net/api/asterisk/ws');
  });

  it('returns empty for an empty host', () => {
    expect(webSocketUrl('  ')).toBe('');
  });
});

describe('hostOf', () => {
  it('strips scheme, port and path', () => {
    expect(hostOf('wss://pbx.example.com:443/api/asterisk/ws')).toBe('pbx.example.com');
  });
});

describe('parseIceServers', () => {
  it("defaults to Google's STUN server", () => {
    expect(parseIceServers(undefined)).toEqual([{ urls: 'stun:stun.l.google.com:19302' }]);
  });

  it('returns none when set empty', () => {
    expect(parseIceServers('')).toEqual([]);
  });

  it('adds credentials to TURN servers only', () => {
    expect(parseIceServers('stun:s.example.com, turn:t.example.com:3478', 'u', 'p')).toEqual([
      { urls: 'stun:s.example.com' },
      { urls: 'turn:t.example.com:3478', username: 'u', credential: 'p' },
    ]);
  });
});

describe('loadConfig', () => {
  it('turns VITE_SIP_HOST into server and domain overrides', () => {
    const config = loadConfig({ VITE_SIP_HOST: 'pbx.example.com', VITE_SIP_TRACE: 'true' });
    expect(config).toMatchObject({
      wsUrl: 'wss://pbx.example.com/api/asterisk/ws',
      domain: 'pbx.example.com',
      login: '',
      traceSip: true,
    });
  });

  it('lets explicit settings override the host', () => {
    const config = loadConfig({
      VITE_SIP_HOST: 'pbx.example.com',
      VITE_SIP_WS_URL: 'wss://edge.example.com/ws',
      VITE_SIP_DOMAIN: 'sip.example.com',
      VITE_SIP_USERNAME: 'abc123@sip.example.com',
    });
    expect(config).toMatchObject({
      wsUrl: 'wss://edge.example.com/ws',
      domain: 'sip.example.com',
      login: 'abc123@sip.example.com',
      traceSip: false,
    });
  });

  it('leaves the overrides blank with nothing set, so the login rule decides', () => {
    expect(loadConfig({})).toMatchObject({ wsUrl: '', domain: '', login: '' });
  });
});
