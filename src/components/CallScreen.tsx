import React, { useState } from 'react';
import Brand from './Brand';
import StatusPill from './StatusPill';
import Keypad from './Keypad';
import {
  CloseIcon,
  HangupIcon,
  KeypadIcon,
  MicIcon,
  MicOffIcon,
  PauseIcon,
  PhoneIcon,
  PlayIcon,
  TransferIcon,
} from './icons';
import { formatDuration } from './duration';
import type { PhoneState } from '../sip/SipClient';

interface CallScreenProps {
  state: PhoneState;
  accountLabel: string;
  /** The current time, ticking once a second while a call is active. */
  now: number;
  onAnswer: () => void;
  onDecline: () => void;
  onHangup: () => void;
  onToggleMute: () => void;
  onToggleHold: () => void;
  onDtmf: (key: string) => void;
  onTransfer: (target: string) => Promise<void>;
  error?: string | null;
  onDismissError: () => void;
}

/** "200@wazo.example.com" -> "200 · wazo.example.com" */
function splitUri(uri: string | undefined): string {
  if (!uri) return '';
  const at = uri.indexOf('@');
  return at < 0 ? uri : `${uri.slice(0, at)} · ${uri.slice(at + 1)}`;
}

const CallScreen: React.FC<CallScreenProps> = ({
  state,
  accountLabel,
  now,
  onAnswer,
  onDecline,
  onHangup,
  onToggleMute,
  onToggleHold,
  onDtmf,
  onTransfer,
  error,
  onDismissError,
}) => {
  const { call } = state;
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [tones, setTones] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');

  const name = call.remote || '';
  const initial = name.charAt(0).toUpperCase() || '?';

  const sendTone = (key: string) => {
    setTones((sent) => sent + key);
    onDtmf(key);
  };

  const submitTransfer = async () => {
    const target = transferTarget.trim();
    if (!target) return;
    await onTransfer(target);
    setTransferOpen(false);
    setTransferTarget('');
  };

  const alert = error && (
    <div className="alert" role="alert" style={{ marginTop: 16 }}>
      <span>{error}</span>
      <button type="button" className="alert__close" aria-label="Dismiss" onClick={onDismissError}>
        <CloseIcon />
      </button>
    </div>
  );

  const header = (
    <div className="stack" style={{ gap: 20, alignItems: 'flex-start' }}>
      <Brand variant="inline" />
      <StatusPill registration={state.registration} label={accountLabel} />
    </div>
  );

  const hangup = (
    <div className="action-group">
      <button type="button" className="action action--end" aria-label="Hang up" onClick={onHangup}>
        <HangupIcon />
      </button>
      <span className="action__label">Hang up</span>
    </div>
  );

  if (call.status === 'incoming') {
    return (
      <div className="screen">
        {header}
        {alert}
        <div className="call-center" style={{ marginTop: 64 }}>
          <span className="eyebrow">Incoming call</span>
          <div className="avatar avatar--incoming" aria-hidden="true">
            {initial}
          </div>
          <div className="stack stack--center" style={{ gap: 8, marginTop: 14 }}>
            <h1 className="call-name call-name--incoming">{name}</h1>
            <span className="call-uri">{splitUri(call.remoteUri)}</span>
          </div>
        </div>
        <div className="push-down action-row" style={{ paddingBottom: 12 }}>
          <div className="action-group">
            <button type="button" className="action action--end" aria-label="Decline" onClick={onDecline}>
              <HangupIcon />
            </button>
            <span className="action__label">Decline</span>
          </div>
          <div className="action-group">
            <button type="button" className="action action--call" aria-label="Answer" onClick={onAnswer}>
              <PhoneIcon />
            </button>
            <span className="action__label">Answer</span>
          </div>
        </div>
      </div>
    );
  }

  if (call.status === 'dialing') {
    return (
      <div className="screen">
        {header}
        {alert}
        <div className="call-center" style={{ marginTop: 56 }}>
          <div className="avatar avatar--active" aria-hidden="true">
            {initial}
          </div>
          <div className="stack stack--center" style={{ gap: 10 }}>
            <h1 className="call-name">{name}</h1>
            <span className="call-status">Calling…</span>
          </div>
        </div>
        <div className="push-down row row--center" style={{ paddingBottom: 12 }}>
          {hangup}
        </div>
      </div>
    );
  }

  const statusClass = call.held ? 'call-status call-status--held' : 'call-status call-status--active';

  return (
    <div className="screen">
      {header}
      {alert}

      <div className="call-center" style={{ marginTop: keypadOpen ? 28 : 56 }}>
        {!keypadOpen && (
          <div className="avatar avatar--active" aria-hidden="true">
            {initial}
          </div>
        )}
        <div className="stack stack--center" style={{ gap: 10 }}>
          <h1 className="call-name">{name}</h1>
          <span className={statusClass}>
            <span className="call-status__dot" aria-hidden="true" />
            {call.held ? 'On hold' : 'In call'}
            <span className="call-timer">{formatDuration(now - (call.answeredAt ?? now))}</span>
          </span>
        </div>
      </div>

      {keypadOpen ? (
        <div className="stack stack--center" style={{ gap: 14, marginTop: 24 }}>
          <div className="tones" aria-live="polite" aria-label="Tones sent">
            {tones}
          </div>
          <Keypad compact onKey={sendTone} />
          <button type="button" className="btn-text" onClick={() => setKeypadOpen(false)}>
            Hide keypad
          </button>
        </div>
      ) : (
        <div className="controls" style={{ marginTop: 72 }}>
          <div className="control-group">
            <button
              type="button"
              className={`control${call.muted ? ' control--on' : ''}`}
              aria-label={call.muted ? 'Unmute' : 'Mute'}
              aria-pressed={call.muted}
              onClick={onToggleMute}
            >
              {call.muted ? <MicOffIcon /> : <MicIcon />}
            </button>
            <span className="control__label">Mute</span>
          </div>
          <div className="control-group">
            <button
              type="button"
              className={`control${call.held ? ' control--on' : ''}`}
              aria-label={call.held ? 'Resume' : 'Hold'}
              aria-pressed={call.held}
              onClick={onToggleHold}
            >
              {call.held ? <PlayIcon /> : <PauseIcon />}
            </button>
            <span className="control__label">Hold</span>
          </div>
          <div className="control-group">
            <button type="button" className="control" aria-label="Keypad" onClick={() => setKeypadOpen(true)}>
              <KeypadIcon />
            </button>
            <span className="control__label">Keypad</span>
          </div>
          <div className="control-group">
            <button type="button" className="control" aria-label="Transfer" onClick={() => setTransferOpen(true)}>
              <TransferIcon />
            </button>
            <span className="control__label">Transfer</span>
          </div>
        </div>
      )}

      <div className="push-down row row--center" style={{ paddingBottom: 12 }}>
        {hangup}
      </div>

      {transferOpen && (
        <div className="dialog__backdrop">
          <form
            className="dialog"
            role="dialog"
            aria-labelledby="transfer-title"
            onSubmit={(e) => {
              e.preventDefault();
              void submitTransfer();
            }}
          >
            <h2 id="transfer-title" className="dialog__title">
              Transfer call
            </h2>
            <div className="field">
              <label className="field__label" htmlFor="transfer-target">
                Transfer to
              </label>
              <input
                id="transfer-target"
                className="field__input"
                type="text"
                inputMode="tel"
                autoFocus
                placeholder="Extension or number"
                value={transferTarget}
                onChange={(e) => setTransferTarget(e.target.value)}
              />
            </div>
            <div className="dialog__actions">
              <button type="button" className="btn-secondary" onClick={() => setTransferOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary btn-primary--small" disabled={!transferTarget.trim()}>
                Transfer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CallScreen;
