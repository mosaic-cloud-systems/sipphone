import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'sip.js';

// A stand-in for SIP.js's SessionManager that records what the client asks of it
// and lets each test play the events Wazo would send.
const fake = vi.hoisted(() => {
  class FakeSessionManager {
    static last: FakeSessionManager;
    delegate: Record<string, (...args: unknown[]) => void> = {};
    registerOptions: { requestDelegate?: { onReject?: (r: unknown) => void } } = {};
    muted = false;
    held = false;
    connect = vi.fn(async () => {});
    disconnect = vi.fn(async () => {});
    unregister = vi.fn(async () => {});
    register = vi.fn(async (options: FakeSessionManager['registerOptions']) => {
      this.registerOptions = options;
    });
    call = vi.fn(async () => {});
    answer = vi.fn(async () => {});
    decline = vi.fn(async () => {});
    hangup = vi.fn(async () => {});
    hold = vi.fn(async () => {});
    unhold = vi.fn(async () => {});
    sendDTMF = vi.fn(async () => {});
    transfer = vi.fn(async () => {});
    isHeld = () => this.held;
    isMuted = () => this.muted;
    mute = vi.fn(() => {
      this.muted = true;
    });
    unmute = vi.fn(() => {
      this.muted = false;
    });

    constructor(
      public server: string,
      public options: Record<string, any>,
    ) {
      FakeSessionManager.last = this;
    }
  }
  return { FakeSessionManager };
});

vi.mock('sip.js', () => ({ Web: { SessionManager: fake.FakeSessionManager } }));

import { SipClient } from './SipClient';

const account = {
  wsUrl: 'wss://wazo.example.com/api/asterisk/ws',
  domain: 'wazo.example.com',
  username: 'line42',
  password: 'secret',
};

function fakeSession(displayName: string, user: string): Session {
  return { remoteIdentity: { displayName, uri: { user, toString: () => `sip:${user}@x` } } } as unknown as Session;
}

describe('SipClient', () => {
  let client: SipClient;
  const manager = () => fake.FakeSessionManager.last;

  beforeEach(async () => {
    client = new SipClient({ iceServers: [], traceSip: false, remoteAudio: {} as HTMLAudioElement });
    await client.connect(account);
  });

  it('registers the line with Wazo over the WebSocket', () => {
    expect(manager().server).toBe(account.wsUrl);
    expect(manager().options.aor).toBe('sip:line42@wazo.example.com');
    expect(manager().options.userAgentOptions).toMatchObject({
      authorizationUsername: 'line42',
      authorizationPassword: 'secret',
    });
    expect(manager().connect).toHaveBeenCalled();
    expect(manager().register).toHaveBeenCalled();
    expect(client.getState().registration).toBe('connecting');

    manager().delegate.onRegistered();
    expect(client.getState().registration).toBe('registered');
  });

  it('stops after a rejected registration instead of retrying', async () => {
    manager().registerOptions.requestDelegate!.onReject!({
      message: { statusCode: 403, reasonPhrase: 'Forbidden' },
    });
    expect(client.getState()).toMatchObject({
      registration: 'error',
      error: 'Registration rejected: 403 Forbidden',
    });
    // It never registered, so an un-REGISTER would only be a second failed attempt.
    expect(manager().unregister).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(manager().disconnect).toHaveBeenCalled());
  });

  it('unregisters the line when disconnecting after a registration', async () => {
    manager().delegate.onRegistered();
    await client.disconnect();
    expect(manager().unregister).toHaveBeenCalled();
    expect(manager().disconnect).toHaveBeenCalled();
    expect(client.getState().registration).toBe('disconnected');
  });

  it('dials numbers and extensions on the account domain', async () => {
    await client.call('+1 (555) 123-4567');
    expect(manager().call).toHaveBeenLastCalledWith('sip:+15551234567@wazo.example.com');
    await client.call('sip:200@other.example.com');
    expect(manager().call).toHaveBeenLastCalledWith('sip:200@other.example.com');
  });

  it('tracks an incoming call from ringing to answered to hung up', async () => {
    const session = fakeSession('Alice', '200');
    manager().delegate.onCallCreated(session);
    manager().delegate.onCallReceived(session);
    expect(client.getState().call).toMatchObject({ status: 'incoming', remote: 'Alice' });

    await client.answer();
    expect(manager().answer).toHaveBeenCalledWith(session);

    manager().delegate.onCallAnswered(session);
    expect(client.getState().call.status).toBe('active');
    expect(client.getState().call.answeredAt).toBeTypeOf('number');

    manager().delegate.onCallHangup(session);
    expect(client.getState().call.status).toBe('idle');
  });

  it('mutes, holds, sends DTMF and transfers the current call', async () => {
    const session = fakeSession('', '300');
    manager().delegate.onCallCreated(session);
    manager().delegate.onCallAnswered(session);
    expect(client.getState().call.remote).toBe('300');

    client.toggleMute();
    expect(client.getState().call.muted).toBe(true);
    client.toggleMute();
    expect(client.getState().call.muted).toBe(false);

    await client.toggleHold();
    expect(manager().hold).toHaveBeenCalledWith(session);
    manager().delegate.onCallHold(session, true);
    expect(client.getState().call.held).toBe(true);

    await client.sendDtmf('5');
    expect(manager().sendDTMF).toHaveBeenCalledWith(session, '5');
    // Tones go in the RTP stream (RFC 4733), as a WebRTC phone would send them, not as SIP INFO.
    expect(manager().options.sendDTMFUsingSessionDescriptionHandler).toBe(true);

    await client.transfer('201');
    expect(manager().transfer).toHaveBeenCalledWith(session, 'sip:201@wazo.example.com');
  });

  it('ignores events from a manager it has already replaced', async () => {
    const old = manager();
    await client.connect(account);
    old.delegate.onRegistered();
    expect(client.getState().registration).toBe('connecting');
  });

  it('refuses call controls with no call in progress', async () => {
    await expect(client.hangup()).rejects.toThrow('No call in progress');
  });
});
