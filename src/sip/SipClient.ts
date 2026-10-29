import { Web } from 'sip.js';
import type { Invitation, Session } from 'sip.js';

export type Registration = 'disconnected' | 'connecting' | 'registered' | 'unregistered' | 'error';
export type CallStatus = 'idle' | 'dialing' | 'incoming' | 'active';

export interface CallInfo {
  status: CallStatus;
  /** Display name, or the user part of the remote URI when there is none. */
  remote?: string;
  /** The remote party as user@host. */
  remoteUri?: string;
  muted: boolean;
  held: boolean;
  /** When the call was answered, in epoch milliseconds. */
  answeredAt?: number;
  /** Which way the call went: placed from here, or received. */
  direction?: 'inbound' | 'outbound';
  /** When the call started (dialled or began ringing), in epoch milliseconds. */
  startedAt?: number;
}

export interface PhoneState {
  registration: Registration;
  error?: string;
  call: CallInfo;
}

export interface SipAccount {
  wsUrl: string;
  domain: string;
  username: string;
  password: string;
}

export interface SipClientOptions {
  iceServers: RTCIceServer[];
  traceSip: boolean;
  /** Where the far end's audio plays. Defaults to a new autoplaying <audio> element. */
  remoteAudio?: HTMLAudioElement;
}

const IDLE_CALL: CallInfo = { status: 'idle', muted: false, held: false };

/**
 * One SIP account with at most one call, on top of SIP.js's SessionManager.
 * The UI reads PhoneState through subscribe() and calls the methods below.
 */
export class SipClient {
  private manager?: Web.SessionManager;
  private session?: Session;
  private domain = '';
  private state: PhoneState = { registration: 'disconnected', call: IDLE_CALL };
  private readonly listeners = new Set<(state: PhoneState) => void>();
  private readonly remoteAudio: HTMLAudioElement;

  constructor(private readonly options: SipClientOptions) {
    this.remoteAudio = options.remoteAudio ?? Object.assign(new Audio(), { autoplay: true });
  }

  getState(): PhoneState {
    return this.state;
  }

  subscribe(listener: (state: PhoneState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async connect(account: SipAccount): Promise<void> {
    await this.disconnect();
    this.domain = account.domain;
    this.update({ registration: 'connecting', error: undefined });

    const manager = new Web.SessionManager(account.wsUrl, {
      aor: `sip:${account.username}@${account.domain}`,
      media: {
        constraints: { audio: true, video: false },
        remote: { audio: this.remoteAudio },
      },
      iceStopWaitingOnServerReflexive: true,
      maxSimultaneousSessions: 1,
      // Send keypad tones in the RTP stream (RFC 4733), as a WebRTC phone does,
      // rather than SessionManager's default SIP INFO.
      sendDTMFUsingSessionDescriptionHandler: true,
      userAgentOptions: {
        authorizationUsername: account.username,
        authorizationPassword: account.password,
        logBuiltinEnabled: this.options.traceSip,
        transportOptions: { server: account.wsUrl, traceSip: this.options.traceSip },
        sessionDescriptionHandlerFactoryOptions: {
          peerConnectionConfiguration: { iceServers: this.options.iceServers },
        },
      },
    });
    manager.delegate = this.delegateFor(manager);
    this.manager = manager;

    try {
      await manager.connect();
      await manager.register({
        requestDelegate: {
          // SessionManager re-sends REGISTER every few seconds after a rejection.
          // With a wrong password that hammers Wazo (and can trip its fail2ban),
          // so stop and let the user fix the credentials.
          onReject: (response) => {
            const { statusCode, reasonPhrase } = response.message;
            void this.stop(manager, `Registration rejected: ${statusCode} ${reasonPhrase}`);
          },
        },
      });
    } catch (error) {
      await this.stop(manager, errorText(error));
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.manager) await this.stop(this.manager);
  }

  async call(target: string): Promise<void> {
    await this.requireManager().call(this.toUri(target));
  }

  async answer(): Promise<void> {
    await this.requireManager().answer(this.requireSession());
  }

  async decline(): Promise<void> {
    await this.requireManager().decline(this.requireSession());
  }

  /** Ends the call, or cancels it while it is still ringing. */
  async hangup(): Promise<void> {
    await this.requireManager().hangup(this.requireSession());
  }

  async toggleHold(): Promise<void> {
    const manager = this.requireManager();
    const session = this.requireSession();
    await (manager.isHeld(session) ? manager.unhold(session) : manager.hold(session));
  }

  toggleMute(): void {
    const manager = this.requireManager();
    const session = this.requireSession();
    if (manager.isMuted(session)) manager.unmute(session);
    else manager.mute(session);
    this.updateCall({ muted: manager.isMuted(session) });
  }

  async sendDtmf(tone: string): Promise<void> {
    await this.requireManager().sendDTMF(this.requireSession(), tone);
  }

  /** Blind transfer: asks the far end (via REFER) to call `target` instead. */
  async transfer(target: string): Promise<void> {
    await this.requireManager().transfer(this.requireSession(), this.toUri(target));
  }

  /** "200", "+1 (555) 123-4567", "200@host" or a full sip: URI -> a SIP URI. */
  toUri(target: string): string {
    const value = target.trim();
    if (/^sips?:/i.test(value)) return value;
    if (value.includes('@')) return `sip:${value}`;
    return `sip:${value.replace(/[\s\-().]/g, '')}@${this.domain}`;
  }

  private delegateFor(manager: Web.SessionManager): Web.SessionManagerDelegate {
    // Ignore late events from a manager we have already replaced or stopped.
    const live = () => manager === this.manager;
    return {
      onServerDisconnect: (error) => {
        if (live()) this.update({ registration: error ? 'error' : 'disconnected', error: error?.message });
      },
      onRegistered: () => {
        if (live()) this.update({ registration: 'registered', error: undefined });
      },
      onUnregistered: () => {
        if (live()) this.update({ registration: 'unregistered' });
      },
      // Fires for every new call, outgoing or incoming; onCallReceived follows for incoming ones.
      onCallCreated: (session) => {
        if (!live()) return;
        // One call at a time. SIP.js only refuses a new call once more than
        // maxSimultaneousSessions are up, so a second INVITE gets here: send
        // it 486 Busy and leave the current call alone.
        if (this.session && 'reject' in session) {
          void (session as Invitation).reject({ statusCode: 486 }).catch(() => undefined);
          return;
        }
        this.session = session;
        this.updateCall({
          ...IDLE_CALL,
          status: 'dialing',
          direction: 'outbound',
          startedAt: Date.now(),
          remote: remoteName(session),
          remoteUri: remoteUri(session),
        });
      },
      onCallReceived: (session) => {
        if (live() && session === this.session) this.updateCall({ status: 'incoming', direction: 'inbound' });
      },
      onCallAnswered: (session) => {
        if (live() && session === this.session) this.updateCall({ status: 'active', answeredAt: Date.now() });
      },
      onCallHold: (session, held) => {
        if (live() && session === this.session) this.updateCall({ held });
      },
      onCallHangup: (session) => {
        if (!live() || session !== this.session) return;
        this.session = undefined;
        this.updateCall(IDLE_CALL);
      },
    };
  }

  private async stop(manager: Web.SessionManager, error?: string): Promise<void> {
    const registered = manager === this.manager && this.state.registration === 'registered';
    if (manager === this.manager) {
      this.manager = undefined;
      this.session = undefined;
    }
    this.update({ registration: error ? 'error' : 'disconnected', error, call: IDLE_CALL });
    // Only a registered line needs an un-REGISTER. After a rejection, SessionManager
    // would still send one, and with a bad password that is a second failed attempt.
    if (registered) {
      try {
        await manager.unregister();
      } catch {
        // The socket is already gone.
      }
    }
    try {
      await manager.disconnect();
    } catch {
      // Already disconnected.
    }
  }

  private requireManager(): Web.SessionManager {
    if (!this.manager) throw new Error('Not connected');
    return this.manager;
  }

  private requireSession(): Session {
    if (!this.session) throw new Error('No call in progress');
    return this.session;
  }

  private update(patch: Partial<PhoneState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener(this.state));
  }

  private updateCall(patch: Partial<CallInfo>): void {
    this.update({ call: { ...this.state.call, ...patch } });
  }
}

function remoteName(session: Session): string {
  const { displayName, uri } = session.remoteIdentity;
  return displayName || uri.user || uri.toString();
}

function remoteUri(session: Session): string {
  const { user, host } = session.remoteIdentity.uri;
  return `${user}@${host}`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
