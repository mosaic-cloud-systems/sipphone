// Recent calls: how a finished call becomes a list entry, and the list rules.
// Field names follow Wazo's CDR (direction, name, start, answered, duration)
// so a server-backed list can replace this one later.
import type { CallInfo } from '../sip/SipClient';

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
    id: crypto.randomUUID(),
    direction: call.direction,
    number,
    ...(name ? { name } : {}),
    start: call.startedAt,
    answered,
    duration: answered ? Math.max(0, Math.floor((endedAt - call.answeredAt!) / 1000)) : 0,
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
