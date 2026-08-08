import type { GreetingProps } from '../types';

/**
 * Minimal sample component for the package starter.
 */
export function Greeting({ name, size = 'md' }: GreetingProps) {
  return (
    <p data-size={size} data-testid="greeting">
      Hello, {name}!
    </p>
  );
}
