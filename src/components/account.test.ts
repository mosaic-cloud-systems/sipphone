import { describe, expect, it } from 'vitest';
import { describeLogin, isComplete, loginErrorHint, resolveAccount, resolveLogin } from './account';

describe('resolveLogin', () => {
  it('turns a Mosaic Voice login into the edge, the realm and the slug-ext account name', () => {
    expect(resolveLogin('1004@dave.mosaicvoice.net')).toEqual({
      username: 'dave-1004',
      domain: 'dave.mosaicvoice.net',
      wsUrl: 'wss://sip.mosaicvoice.net/api/asterisk/ws',
    });
  });

  it('uses any other domain as the server host itself', () => {
    expect(resolveLogin('alice@pbx.example.com')).toEqual({
      username: 'alice',
      domain: 'pbx.example.com',
      wsUrl: 'wss://pbx.example.com/api/asterisk/ws',
    });
  });

  it('does not invent a slug for the shared edge itself', () => {
    expect(resolveLogin('abc123@sip.mosaicvoice.net')).toEqual({
      username: 'abc123',
      domain: 'sip.mosaicvoice.net',
      wsUrl: 'wss://sip.mosaicvoice.net/api/asterisk/ws',
    });
  });

  it('needs a user and a domain', () => {
    expect(resolveLogin('1004')).toBeUndefined();
    expect(resolveLogin('1004@')).toBeUndefined();
    expect(resolveLogin('@dave.mosaicvoice.net')).toBeUndefined();
    expect(resolveLogin('  1004@dave.mosaicvoice.net  ')?.username).toBe('dave-1004');
  });
});

describe('resolveAccount', () => {
  const form = { login: '1004@dave.mosaicvoice.net', password: 'p', wsUrl: '', domain: '' };

  it('follows the login rule when the overrides are blank', () => {
    expect(resolveAccount(form)).toEqual({
      username: 'dave-1004',
      domain: 'dave.mosaicvoice.net',
      wsUrl: 'wss://sip.mosaicvoice.net/api/asterisk/ws',
      password: 'p',
    });
  });

  it('lets the env overrides replace the server and domain', () => {
    expect(resolveAccount({ ...form, wsUrl: 'https://pbx.example.com:8443/', domain: 'x' })).toMatchObject({
      wsUrl: 'wss://pbx.example.com:8443/api/asterisk/ws',
      domain: 'x',
      username: 'dave-1004',
    });
  });

  it('is nothing for a login without a domain', () => {
    expect(resolveAccount({ ...form, login: '1004' })).toBeUndefined();
  });
});

describe('isComplete', () => {
  it('needs a resolvable login and a password', () => {
    expect(isComplete({ login: '1004@dave.mosaicvoice.net', password: 'p', wsUrl: '', domain: '' })).toBe(true);
    expect(isComplete({ login: '1004', password: 'p', wsUrl: '', domain: '' })).toBe(false);
    expect(isComplete({ login: '1004@dave.mosaicvoice.net', password: '', wsUrl: '', domain: '' })).toBe(false);
  });
});

describe('describeLogin', () => {
  it('says where the phone will register and as whom', () => {
    expect(describeLogin({ login: '1004@dave.mosaicvoice.net', password: '', wsUrl: '', domain: '' })).toBe(
      'Registers as dave-1004 on dave.mosaicvoice.net via sip.mosaicvoice.net',
    );
    expect(describeLogin({ login: '1004', password: '', wsUrl: '', domain: '' })).toBe(
      'Looks like 1004@company.mosaicvoice.net',
    );
  });
});

describe('loginErrorHint', () => {
  it('explains a rejected registration without guessing which field', () => {
    expect(loginErrorHint('Registration rejected: 401 Unauthorized')).toBe(
      'The username or password was not accepted. The server does not say which; passwords are case-sensitive.',
    );
    expect(loginErrorHint('Registration rejected: 403 Forbidden')).toBeDefined();
    expect(loginErrorHint('WebSocket closed wss://x (code: 1006)')).toBe(
      'The server could not be reached. Check the domain in the username.',
    );
    expect(loginErrorHint('Something else')).toBeUndefined();
  });
});
