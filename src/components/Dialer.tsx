import React, { useEffect, useRef, useState } from 'react';
import Brand from './Brand';
import StatusPill from './StatusPill';
import Keypad from './Keypad';
import { BackspaceIcon, CloseIcon, LogoutIcon, PhoneIcon, SlidersIcon } from './icons';
import RecentsList from './RecentsList';
import { numberFontSize, shrinkToFit } from './numberSize';
import type { CallEntry, DialerTab } from './recents';
import type { PhoneState } from '../sip/SipClient';

interface DialerProps {
  state: PhoneState;
  accountLabel: string;
  number: string;
  onNumberChange: (value: string) => void;
  onCall: () => void;
  onOpenAccount: () => void;
  onDisconnect: () => void;
  error?: string | null;
  onDismissError: () => void;
  tab: DialerTab;
  onTabChange: (tab: DialerTab) => void;
  entries: CallEntry[];
  /** Missed calls since the Recents tab was last opened; shown as a badge. */
  missedCount: number;
  now: number;
  onCallEntry: (number: string) => void;
  onClearRecents: () => void;
}

const Dialer: React.FC<DialerProps> = ({
  state,
  accountLabel,
  number,
  onNumberChange,
  onCall,
  onOpenAccount,
  onDisconnect,
  error,
  onDismissError,
  tab,
  onTabChange,
  entries,
  missedCount,
  now,
  onCallEntry,
  onClearRecents,
}) => {
  const registered = state.registration === 'registered';
  const canCall = registered && number.trim().length > 0;
  const input = useRef<HTMLInputElement>(null);
  const [fontSize, setFontSize] = useState(() => numberFontSize(number));
  const [overflowing, setOverflowing] = useState(false);

  // The length rule gives an upper size; the real width decides. The size steps
  // down until the number fits. One that is still too wide at the smallest size
  // is left-aligned and kept scrolled to its end, so the latest digits show.
  // Measured again once the web fonts are in, since they change the width.
  useEffect(() => {
    const measure = () => {
      const el = input.current;
      if (!el) return;
      const fits = (size: number) => {
        el.style.fontSize = `${size}px`;
        return el.scrollWidth <= el.clientWidth;
      };
      const size = shrinkToFit(numberFontSize(number), fits);
      setFontSize(size);
      setOverflowing(!fits(size));
      el.scrollLeft = el.scrollWidth;
    };
    measure();
    void document.fonts?.ready.then(measure);
  }, [number, tab]);

  const tabButton = (value: DialerTab, label: string, badge?: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === value}
      className={`segmented__tab${tab === value ? ' segmented__tab--on' : ''}`}
      onClick={() => onTabChange(value)}
    >
      {label}
      {badge ? <span className="badge">{badge}</span> : null}
    </button>
  );

  return (
    <div className="screen">
      <Brand variant="inline" />

      <div className="row row--between" style={{ marginTop: 24 }}>
        <StatusPill registration={state.registration} label={accountLabel} />
        <div className="icon-row">
          <button type="button" className="icon-btn" aria-label="Account settings" onClick={onOpenAccount}>
            <SlidersIcon />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Disconnect"
            disabled={state.registration === 'disconnected'}
            onClick={onDisconnect}
          >
            <LogoutIcon />
          </button>
        </div>
      </div>

      {error && (
        <div className="alert" role="alert" style={{ marginTop: 16 }}>
          <span>{error}</span>
          <button type="button" className="alert__close" aria-label="Dismiss" onClick={onDismissError}>
            <CloseIcon />
          </button>
        </div>
      )}

      <div role="tablist" aria-label="Dialer view" className="segmented" style={{ marginTop: 24 }}>
        {tabButton('keypad', 'Keypad')}
        {tabButton('recents', 'Recents', missedCount)}
      </div>

      {tab === 'recents' ? (
        <RecentsList entries={entries} now={now} canCall={registered} onCall={onCallEntry} onClear={onClearRecents} />
      ) : (
        <>
          <div className="number-line" style={{ marginTop: 40 }}>
            <span className="number-line__spacer" aria-hidden="true" />
            <input
              ref={input}
              className={`number-line__input${overflowing ? ' number-line__input--overflow' : ''}`}
              type="text"
              inputMode="tel"
              aria-label="Number"
              placeholder="Extension or number"
              autoComplete="off"
              spellCheck={false}
              value={number}
              style={{ fontSize }}
              onChange={(e) => onNumberChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canCall) onCall();
              }}
            />
            {number ? (
              <button
                type="button"
                className="icon-btn icon-btn--plain"
                aria-label="Delete last digit"
                onClick={() => onNumberChange(number.slice(0, -1))}
              >
                <BackspaceIcon />
              </button>
            ) : (
              <span className="number-line__spacer" aria-hidden="true" />
            )}
          </div>

          <div className="push-down stack stack--center" style={{ gap: 28 }}>
            <Keypad onKey={(key) => onNumberChange(number + key)} />
            <button
              type="button"
              className="action action--call"
              aria-label="Call"
              disabled={!canCall}
              onClick={onCall}
            >
              <PhoneIcon />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Dialer;
