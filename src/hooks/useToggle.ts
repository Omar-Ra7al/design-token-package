import { useCallback, useState } from 'react';

/**
 * Boolean state hook with a stable toggle callback.
 */
export function useToggle(initial = false): [boolean, () => void] {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => {
    setValue((current) => !current);
  }, []);

  return [value, toggle];
}
