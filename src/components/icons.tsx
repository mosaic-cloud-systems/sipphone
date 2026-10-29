import React from 'react';

// Inline stroke icons (24-unit viewBox). All decorative: the button they sit
// in carries the accessible name.

type IconProps = { size?: number };

const Stroke: React.FC<IconProps & { children: React.ReactNode; strokeWidth?: number }> = ({
  size = 24,
  strokeWidth = 1.8,
  children,
}) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const PHONE_PATH =
  'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z';

export const PhoneIcon: React.FC<IconProps> = ({ size = 28 }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d={PHONE_PATH} />
  </svg>
);

export const HangupIcon: React.FC<IconProps> = ({ size = 28 }) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ transform: 'rotate(135deg)' }}
  >
    <path d={PHONE_PATH} />
  </svg>
);

export const MicIcon: React.FC<IconProps> = (props) => (
  <Stroke {...props}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </Stroke>
);

export const MicOffIcon: React.FC<IconProps> = (props) => (
  <Stroke {...props}>
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </Stroke>
);

export const PauseIcon: React.FC<IconProps> = (props) => (
  <Stroke {...props}>
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </Stroke>
);

export const PlayIcon: React.FC<IconProps> = (props) => (
  <Stroke {...props}>
    <polygon points="6 3 20 12 6 21 6 3" />
  </Stroke>
);

export const KeypadIcon: React.FC<IconProps> = (props) => (
  <Stroke {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </Stroke>
);

export const TransferIcon: React.FC<IconProps> = (props) => (
  <Stroke {...props}>
    <polyline points="15 14 20 9 15 4" />
    <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
  </Stroke>
);

export const SlidersIcon: React.FC<IconProps> = ({ size = 18 }) => (
  <Stroke size={size} strokeWidth={2}>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </Stroke>
);

export const LogoutIcon: React.FC<IconProps> = ({ size = 18 }) => (
  <Stroke size={size} strokeWidth={2}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </Stroke>
);

export const BackspaceIcon: React.FC<IconProps> = (props) => (
  <Stroke {...props}>
    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
    <line x1="18" y1="9" x2="12" y2="15" />
    <line x1="12" y1="9" x2="18" y2="15" />
  </Stroke>
);

export const CloseIcon: React.FC<IconProps> = ({ size = 16 }) => (
  <Stroke size={size} strokeWidth={2}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Stroke>
);
