import { describe, expect, it } from 'vitest';
import { clamp } from '../src/utils/clamp';

describe('clamp', () => {
  it('returns the value when it is within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('returns the minimum when the value is too low', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it('returns the maximum when the value is too high', () => {
    expect(clamp(20, 0, 10)).toBe(10);
  });
});
