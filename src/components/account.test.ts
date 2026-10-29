import { describe, expect, it } from 'vitest';
import { isComplete, resolveAccount } from './account';

describe('resolveAccount', () => {
  it('derives the WebSocket URL and keeps a port', () => {
    const account = resolveAccount({
      wsUrl: 'https://pbx.example.com:8443/',
      domain: 'x',
      username: 'u',
      password: 'p',
    });
    expect(account.wsUrl).toBe('wss://pbx.example.com:8443/api/asterisk/ws');
  });

  it('falls back to the server host when the domain is blank', () => {
    const account = resolveAccount({ wsUrl: 'pbx.example.com', domain: '  ', username: 'line42', password: 'p' });
    expect(account.domain).toBe('pbx.example.com');
    expect(account.username).toBe('line42');
  });
});

describe('isComplete', () => {
  const ok = { wsUrl: 'sip.mosaicvoice.net', domain: '', username: 'dave', password: 'p' };

  it('needs a server, a username and a password', () => {
    expect(isComplete(ok)).toBe(true);
    expect(isComplete({ ...ok, username: '   ' })).toBe(false);
    expect(isComplete({ ...ok, password: '' })).toBe(false);
    expect(isComplete({ ...ok, wsUrl: ' ' })).toBe(false);
  });
});
