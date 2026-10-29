import { describe, expect, it } from 'vitest';
import { addEntry, ariaLabel, entryFor, isMissed, rowText, unseenMissed, whenLabel, type CallEntry } from './recents';

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

const now = new Date(2026, 9, 29, 10, 30).getTime(); // local time
const t = (h: number, m: number) => new Date(2026, 9, 29, h, m).getTime();
const yesterday = (h: number, m: number) => new Date(2026, 9, 28, h, m).getTime();
const oct27 = new Date(2026, 9, 27, 9, 0).getTime();
const inbound = (o: Partial<CallEntry>): CallEntry => ({ ...sample, direction: 'inbound', answered: false, duration: 0, ...o });
const outbound = (o: Partial<CallEntry>): CallEntry => ({ ...sample, direction: 'outbound', answered: false, duration: 0, ...o });

describe('rowText', () => {
  it('names the row and describes the call on the second line', () => {
    expect(rowText(inbound({ name: 'Test 1003', number: '1003', answered: true, duration: 58 }))).toEqual({ title: 'Test 1003', meta: 'Incoming · 1003 · 0:58' });
    expect(rowText(inbound({ name: 'Dave Burrito', number: '2263390620' }))).toEqual({ title: 'Dave Burrito', meta: 'Missed · 2263390620' });
    expect(rowText(inbound({ number: '+1 226 555 0142' }))).toEqual({ title: '+1 226 555 0142', meta: 'Missed' });
    expect(rowText(outbound({ number: '8000', answered: true, duration: 252 }))).toEqual({ title: '8000', meta: 'Outgoing · 4:12' });
    expect(rowText(outbound({ number: '1001' }))).toEqual({ title: '1001', meta: 'Outgoing · No answer' });
  });
});

describe('whenLabel', () => {
  it('shows the time today, Yesterday, else the date', () => {
    expect(whenLabel(t(10, 2), now)).toBe('10:02');
    expect(whenLabel(t(0, 10), now)).toBe('00:10');
    expect(whenLabel(yesterday(23, 50), now)).toBe('Yesterday');
    expect(whenLabel(oct27, now)).toBe('Oct 27');
  });
});

describe('ariaLabel', () => {
  it('reads the row out as a sentence', () => {
    expect(ariaLabel(inbound({ name: 'Dave Burrito', number: '2263390620', start: t(10, 2) }), now)).toBe('Call Dave Burrito, missed call today at 10:02');
    expect(ariaLabel(outbound({ number: '8000', answered: true, duration: 252, start: t(9, 41) }), now)).toBe('Call 8000, outgoing call today at 09:41, 4 minutes 12 seconds');
    expect(ariaLabel(outbound({ number: '7000', answered: true, duration: 65, start: yesterday(9, 0) }), now)).toBe('Call 7000, outgoing call yesterday at 09:00, 1 minute 5 seconds');
    expect(ariaLabel(outbound({ number: '1001', start: oct27 }), now)).toBe('Call 1001, outgoing call on Oct 27, not answered');
    expect(ariaLabel(inbound({ number: '1003', answered: true, duration: 58, start: t(9, 30) }), now)).toBe('Call 1003, incoming call today at 09:30, 58 seconds');
  });
});
