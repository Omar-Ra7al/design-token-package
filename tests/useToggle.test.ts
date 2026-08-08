import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useToggle } from '../src/hooks/useToggle';

describe('useToggle', () => {
  it('starts with the provided initial value', () => {
    const { result } = renderHook(() => useToggle(true));

    expect(result.current[0]).toBe(true);
  });

  it('toggles the value', () => {
    const { result } = renderHook(() => useToggle());

    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe(true);
  });
});
