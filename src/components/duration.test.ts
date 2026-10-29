import { describe, expect, it } from 'vitest';
import { formatDuration } from './duration';

describe('formatDuration', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatDuration(65_000)).toBe('1:05');
  });

  it('never shows a negative duration', () => {
    // The screen's clock can lag the answer time by up to a second.
    expect(formatDuration(-800)).toBe('0:00');
  });
});
