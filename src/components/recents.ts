// Recent calls: how a finished call becomes a list entry, and the list rules.
// Field names follow a typical PBX call record (direction, name, start, answered, duration)
// so a server-backed list can replace this one later.
import type { CallInfo } from '../sip/SipClient';
import { formatDuration } from './duration';

export interface CallEntry {
  id: string;
  direction: 'inbound' | 'outbound';
  /** The number or extension: the user part of the remote URI. */
  number: string;
  /** The caller's display name, incoming calls only, when it differs from the number. */
  name?: string;
  /** When the call started, in epoch milliseconds. */
  start: number;
  answered: boolean;
  /** Seconds from answer to hang-up; 0 when not answered. */
  duration: number;
}

export const RECENTS_CAP = 100;

/** The entry for a call that just ended, or nothing if the state never saw it start. */
export function entryFor(call: CallInfo, endedAt: number): CallEntry | undefined {
  if (!call.direction || call.startedAt === undefined) return undefined;
  const user = (call.remoteUri ?? '').split('@')[0];
  const number = user && user !== 'undefined' ? user : (call.remote ?? '');
  const name = call.direction === 'inbound' && call.remote && call.remote !== number ? call.remote : undefined;
  const answered = call.answeredAt !== undefined;
  return {
    id: newId(call.startedAt),
    direction: call.direction,
    number,
    ...(name ? { name } : {}),
    start: call.startedAt,
    answered,
    duration: answered ? Math.max(0, Math.floor((endedAt - call.answeredAt!) / 1000)) : 0,
  };
}

/** randomUUID only exists on secure origins; a dev server on a LAN address has none. */
function newId(start: number): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${start}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Follows the call state and yields an entry each time a call it saw ends.
 * Meant to run inside the client's subscriber, outside React's render cycle,
 * so the entry is saved even when the page is unloading.
 */
export function callRecorder(): (call: CallInfo, now: number) => CallEntry | undefined {
  let last: CallInfo | undefined;
  return (call, now) => {
    if (call.status !== 'idle') {
      last = call;
      return undefined;
    }
    const ended = last;
    last = undefined;
    return ended ? entryFor(ended, now) : undefined;
  };
}

export function isMissed(entry: CallEntry): boolean {
  return entry.direction === 'inbound' && !entry.answered;
}

/** A new list with the entry first, trimmed to the cap. */
export function addEntry(entries: CallEntry[], entry: CallEntry, cap = RECENTS_CAP): CallEntry[] {
  return [entry, ...entries].slice(0, cap);
}

/** Missed calls that started after the user last looked at the list. */
export function unseenMissed(entries: CallEntry[], seenAt: number): number {
  return entries.filter((e) => isMissed(e) && e.start > seenAt).length;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** First line and second line of a row, per the design's copy rules. */
export function rowText(entry: CallEntry): { title: string; meta: string } {
  const missed = isMissed(entry);
  const parts = [missed ? 'Missed' : entry.direction === 'inbound' ? 'Incoming' : 'Outgoing'];
  if (entry.name) parts.push(entry.number);
  if (entry.answered) parts.push(formatDuration(entry.duration * 1000));
  else if (!missed) parts.push('No answer');
  return { title: entry.name ?? entry.number, meta: parts.join(' · ') };
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function clock(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "today" | "yesterday" | undefined for an older day, by local calendar day. */
function dayOf(start: number, now: number): 'today' | 'yesterday' | undefined {
  const d = new Date(start);
  const today = new Date(now);
  if (sameDay(d, today)) return 'today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return sameDay(d, yesterday) ? 'yesterday' : undefined;
}

/** "HH:MM" today, "Yesterday", else "Mon D". */
export function whenLabel(start: number, now: number): string {
  const d = new Date(start);
  switch (dayOf(start, now)) {
    case 'today':
      return clock(d);
    case 'yesterday':
      return 'Yesterday';
    default:
      return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  }
}

function spokenDuration(seconds: number): string {
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${unit(m, 'minute')} ${unit(s, 'second')}` : unit(s, 'second');
}

/** The row read out as one sentence for screen readers. */
export function ariaLabel(entry: CallEntry, now: number): string {
  const kind = isMissed(entry) ? 'missed call' : entry.direction === 'inbound' ? 'incoming call' : 'outgoing call';
  const d = new Date(entry.start);
  const day = dayOf(entry.start, now);
  const when = day ? `${day} at ${clock(d)}` : `on ${whenLabel(entry.start, now)}`;
  let tail = '';
  if (entry.answered) tail = `, ${spokenDuration(entry.duration)}`;
  else if (entry.direction === 'outbound') tail = ', not answered';
  return `Call ${entry.name ?? entry.number}, ${kind} ${when}${tail}`;
}

// Persistence: one store per account in this browser, plus the chosen dialer tab.
// A blocked or corrupt store reads as empty and never throws.

export interface RecentsStore {
  entries: CallEntry[];
  /** When the user last opened the Recents tab, in epoch milliseconds; 0 = never. */
  seenAt: number;
}

export type DialerTab = 'keypad' | 'recents';
export const TAB_KEY = 'sipphone.dialerTab';

export function recentsKey(accountLabel: string): string {
  return `sipphone.recents.${accountLabel}`;
}

function isEntry(value: unknown): value is CallEntry {
  return typeof value === 'object' && value !== null && typeof (value as CallEntry).number === 'string';
}

export function loadRecents(key: string): RecentsStore {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? '{}') as Partial<RecentsStore>;
    return {
      entries: Array.isArray(raw.entries) ? raw.entries.filter(isEntry) : [],
      seenAt: typeof raw.seenAt === 'number' ? raw.seenAt : 0,
    };
  } catch {
    return { entries: [], seenAt: 0 };
  }
}

export function saveRecents(key: string, store: RecentsStore): void {
  try {
    localStorage.setItem(key, JSON.stringify(store));
  } catch {
    // Storage blocked (private window): the list just won't survive a reload.
  }
}

export function loadTab(): DialerTab {
  try {
    return localStorage.getItem(TAB_KEY) === 'recents' ? 'recents' : 'keypad';
  } catch {
    return 'keypad';
  }
}

export function saveTab(tab: DialerTab): void {
  try {
    localStorage.setItem(TAB_KEY, tab);
  } catch {
    // As above.
  }
}
