import React from 'react';
import type { Registration } from '../sip/SipClient';

const TEXT: Record<Registration, string> = {
  disconnected: 'Offline',
  connecting: 'Connecting…',
  registered: 'Registered',
  unregistered: 'Not registered',
  error: 'Error',
};

const DOT: Partial<Record<Registration, string>> = {
  registered: 'pill__dot--registered',
  connecting: 'pill__dot--connecting',
  error: 'pill__dot--error',
};

/** Registration state with the account it applies to. */
const StatusPill: React.FC<{ registration: Registration; label: string }> = ({ registration, label }) => (
  <div className="pill">
    <span className={`pill__dot ${DOT[registration] ?? ''}`} aria-hidden="true" />
    <span className="pill__text">{TEXT[registration]}</span>
    <span className="pill__label">{label}</span>
  </div>
);

export default StatusPill;
