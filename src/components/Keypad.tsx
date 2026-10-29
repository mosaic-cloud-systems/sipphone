import React from 'react';

const KEYS: [string, string][] = [
  ['1', ''],
  ['2', 'ABC'],
  ['3', 'DEF'],
  ['4', 'GHI'],
  ['5', 'JKL'],
  ['6', 'MNO'],
  ['7', 'PQRS'],
  ['8', 'TUV'],
  ['9', 'WXYZ'],
  ['*', ''],
  ['0', '+'],
  ['#', ''],
];

interface KeypadProps {
  onKey: (key: string) => void;
  /** Smaller keys without letter groups, for use during a call. */
  compact?: boolean;
  disabled?: boolean;
}

const Keypad: React.FC<KeypadProps> = ({ onKey, compact = false, disabled = false }) => (
  <div className={`keypad${compact ? ' keypad--compact' : ''}`}>
    {KEYS.map(([digit, letters]) => (
      <button
        key={digit}
        type="button"
        className={`key${compact ? ' key--compact' : ''}`}
        aria-label={digit}
        disabled={disabled}
        onClick={() => onKey(digit)}
      >
        <span className="key__digit" aria-hidden="true">
          {digit}
        </span>
        {!compact && (
          <span className="key__letters" aria-hidden="true">
            {letters}
          </span>
        )}
      </button>
    ))}
  </div>
);

export default Keypad;
