import { describe, expect, it } from 'vitest';
import { addEntry, entryFor, isMissed, unseenMissed, type CallEntry } from './recents';

const base = { status: 'idle' as const, muted: false, held: false };

const sample: CallEntry = {
  id: 's',
  direction: 'outbound',
  number: '8000',
  start: 1000,
  answered: true,
  duration: 10,
};
const missed = (start: number): CallEntry => ({ ...sample, id: `m${start}`, direction: 'inbound', answered: false, duration: 0, start });
const answered = (start: number): CallEntry => ({ ...sample, id: `a${start}`, direction: 'inbound', start });

describe('entryFor', () => {
  it('builds an answered incoming entry with the caller name and duration', () => {
    const e = entryFor(
      { ...base, direction: 'inbound', startedAt: 1000, answeredAt: 5000, remote: 'Test 1003', remoteUri: '1003@test.mosaicvoice.net' },
      63500,
    )!;
    expect(e).toMatchObject({ direction: 'inbound', number: '1003', name: 'Test 1003', start: 1000, answered: true, duration: 58 });
    expect(e.id).toBeTruthy();
    expect(isMissed(e)).toBe(false);
  });

  it('builds a missed entry with no duration', () => {
    const e = entryFor(
      { ...base, direction: 'inbound', startedAt: 1000, remote: '2263390620', remoteUri: '2263390620@test.mosaicvoice.net' },
      9000,
    )!;
    expect(e).toMatchObject({ number: '2263390620', answered: false, duration: 0 });
    expect(e.name).toBeUndefined();
    expect(isMissed(e)).toBe(true);
  });

  it('never names an outgoing call and treats a failed one as unanswered', () => {
    const e = entryFor(
      { ...base, direction: 'outbound', startedAt: 1000, remote: '8000', remoteUri: '8000@test.mosaicvoice.net' },
      1200,
    )!;
    expect(e).toMatchObject({ direction: 'outbound', number: '8000', answered: false, duration: 0 });
    expect(e.name).toBeUndefined();
    expect(isMissed(e)).toBe(false);
  });

  it('falls back to the remote text when the URI has no user part', () => {
    const e = entryFor(
      { ...base, direction: 'inbound', startedAt: 1, remote: 'anonymous', remoteUri: 'undefined@test.mosaicvoice.net' },
      2,
    )!;
    expect(e.number).toBe('anonymous');
    expect(e.name).toBeUndefined();
  });

  it('returns nothing for a call the state never saw start', () => {
    expect(entryFor(base, 5)).toBeUndefined();
  });
});

describe('addEntry', () => {
  it('adds newest first and keeps the cap', () => {
    const list = [...Array(100)].map((_, i) => ({ ...sample, id: String(i) }));
    const out = addEntry(list, { ...sample, id: 'new' });
    expect(out[0].id).toBe('new');
    expect(out).toHaveLength(100);
    expect(out[99].id).toBe('98');
    expect(list).toHaveLength(100);
  });
});

describe('unseenMissed', () => {
  it('counts missed calls newer than the seen marker', () => {
    expect(unseenMissed([missed(10), missed(20), answered(30)], 15)).toBe(1);
    expect(unseenMissed([missed(10), missed(20)], 0)).toBe(2);
  });
});
