import React from 'react';
import { ArrowInIcon, ArrowOutIcon } from './icons';
import { ariaLabel, isMissed, rowText, whenLabel, type CallEntry } from './recents';

interface RecentsProps {
  entries: CallEntry[];
  /** The current time, for "today" and "Yesterday". */
  now: number;
  /** False while the line is not registered: rows are shown but disabled. */
  canCall: boolean;
  onCall: (number: string) => void;
  onClear: () => void;
}

/** The recent calls list: one button per call, newest first. */
const Recents: React.FC<RecentsProps> = ({ entries, now, canCall, onCall, onClear }) => (
  <div className="recents">
    <div className="row row--between">
      <span className="recents__head">Recent calls</span>
      {entries.length > 0 && (
        <button type="button" className="link-btn" onClick={onClear}>
          Clear
        </button>
      )}
    </div>
    {entries.length === 0 ? (
      <p className="recents__empty">No calls yet</p>
    ) : (
      <ul className="recents__list">
        {entries.map((entry) => {
          const missed = isMissed(entry);
          const { title, meta } = rowText(entry);
          const mark = `recent__mark${missed ? ' recent__mark--missed' : entry.direction === 'outbound' ? ' recent__mark--out' : ''}`;
          return (
            <li key={entry.id}>
              <button
                type="button"
                className="recent"
                aria-label={ariaLabel(entry, now)}
                disabled={!canCall}
                onClick={() => onCall(entry.number)}
              >
                <span className={mark} aria-hidden="true">
                  {entry.direction === 'outbound' ? <ArrowOutIcon /> : <ArrowInIcon />}
                </span>
                <span className="recent__who">
                  <span className={`recent__title${missed ? ' recent__title--missed' : ''}`}>{title}</span>
                  <span className="recent__meta">{meta}</span>
                </span>
                <span className="recent__when">{whenLabel(entry.start, now)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);

export default Recents;
