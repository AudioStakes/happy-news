import { describe, expect, it } from 'vitest';

import { isNewsStatus, parseNewsStatusFilter } from './statusValidation';

describe('statusValidation', () => {
  it('recognizes valid statuses', () => {
    expect(isNewsStatus('unclassified')).toBe(true);
    expect(isNewsStatus('candidate')).toBe(true);
    expect(isNewsStatus('not_real')).toBe(false);
  });

  it('parses a valid filter', () => {
    expect(parseNewsStatusFilter('archived')).toEqual({ value: 'archived', error: null });
  });

  it('ignores empty filter', () => {
    expect(parseNewsStatusFilter('   ')).toEqual({ value: null, error: null });
  });

  it('returns friendly error for invalid filter', () => {
    expect(parseNewsStatusFilter('bad')).toEqual({
      value: null,
      error: 'Invalid status filter "bad". Showing all statuses instead.'
    });
  });
});
