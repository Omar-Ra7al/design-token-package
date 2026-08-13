import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { defineTokens } from '../src/defineTokens';
import { TokenSheet } from '../src/shared/TokenSheet';

const tokens = defineTokens({
  selector: 'class',
  defaultTheme: 'light',
  tokens: {
    color: {
      background: '#fafafa',
      foreground: '#111111',
    },
  },
  themes: {
    dark: {
      color: {
        background: '#111111',
        foreground: '#fafafa',
      },
    },
  },
});

describe('TokenSheet', () => {
  it('injects a style tag with tokens.css()', () => {
    const { container } = render(<TokenSheet tokens={tokens} />);
    const style = container.querySelector('style');

    expect(style).not.toBeNull();
    expect(style?.innerHTML).toBe(tokens.css());
    expect(style?.innerHTML).toContain('--background:#fafafa');
    expect(style?.innerHTML).toContain('.dark{');
    expect(style?.innerHTML).not.toContain('.light{');
  });
});
