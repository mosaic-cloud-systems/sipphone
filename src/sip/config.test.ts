import { describe, expect, it } from 'vitest';
import { hostOf, loadConfig, parseIceServers, wazoWebSocketUrl } from './config';

describe('wazoWebSocketUrl', () => {
  it('builds the Wazo WebSocket URL from a host', () => {
    expect(wazoWebSocketUrl('wazo.example.com')).toBe('wss://wazo.example.com/api/asterisk/ws');
  });

  it('accepts an https URL and keeps a port', () => {
    expect(wazoWebSocketUrl('https://wazo.example.com:8443/')).toBe(
      'wss://wazo.example.com:8443/api/asterisk/ws',
    );
  });

  it('returns a ws:// or wss:// URL with a path unchanged', () => {
    expect(wazoWebSocketUrl('wss://pbx.example.com/ws')).toBe('wss://pbx.example.com/ws');
  });

  it('adds the Wazo path to a wss:// URL that has none', () => {
    // The edge answers 404 at "/" and the browser closes the socket with code 1006.
    expect(wazoWebSocketUrl('wss://sip.mosaicvoice.net')).toBe('wss://sip.mosaicvoice.net/api/asterisk/ws');
    expect(wazoWebSocketUrl('wss://sip.mosaicvoice.net/')).toBe('wss://sip.mosaicvoice.net/api/asterisk/ws');
  });

  it('returns empty for an empty host', () => {
    expect(wazoWebSocketUrl('  ')).toBe('');
  });
});

describe('hostOf', () => {
  it('strips scheme, port and path', () => {
    expect(hostOf('wss://wazo.example.com:443/api/asterisk/ws')).toBe('wazo.example.com');
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
  it('derives the WebSocket URL and domain from VITE_WAZO_HOST', () => {
    const config = loadConfig({ VITE_WAZO_HOST: 'wazo.example.com', VITE_SIP_TRACE: 'true' });
    expect(config).toMatchObject({
      wsUrl: 'wss://wazo.example.com/api/asterisk/ws',
      domain: 'wazo.example.com',
      username: '',
      traceSip: true,
    });
  });

  it('lets explicit settings override the host', () => {
    const config = loadConfig({
      VITE_WAZO_HOST: 'wazo.example.com',
      VITE_SIP_WS_URL: 'wss://edge.example.com/ws',
      VITE_SIP_DOMAIN: 'sip.example.com',
      VITE_SIP_USERNAME: 'abc123',
    });
    expect(config).toMatchObject({
      wsUrl: 'wss://edge.example.com/ws',
      domain: 'sip.example.com',
      username: 'abc123',
      traceSip: false,
    });
  });

  it('defaults to the Mosaic Voice edge without a host', () => {
    expect(loadConfig({})).toMatchObject({
      wsUrl: 'wss://sip.mosaicvoice.net/api/asterisk/ws',
      domain: 'sip.mosaicvoice.net',
    });
  });

  it('still lets VITE_WAZO_HOST point at a plain Wazo', () => {
    expect(loadConfig({ VITE_WAZO_HOST: 'wazo.example.com' })).toMatchObject({
      wsUrl: 'wss://wazo.example.com/api/asterisk/ws',
      domain: 'wazo.example.com',
    });
  });
});
