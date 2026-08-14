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
  it('injects a style tag with tokens.stylesheet()', () => {
    const { container } = render(<TokenSheet tokens={tokens} />);
    const style = container.querySelector('style');

    expect(style).not.toBeNull();
    expect(style?.innerHTML).toBe(tokens.stylesheet());
    expect(style?.innerHTML).toContain('--background:#fafafa');
    expect(style?.innerHTML).toContain('.dark{');
    expect(style?.innerHTML).not.toContain('.light{');
    expect(style?.innerHTML).not.toContain('@theme');
  });

  it('appends tokens.tailwind() when generateThemeInline is on', () => {
    const withTailwind = defineTokens({
      selector: 'class',
      defaultTheme: 'light',
      tailwind: { generateThemeInline: true },
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

    const { container } = render(<TokenSheet tokens={withTailwind} />);
    const style = container.querySelector('style');

    expect(style?.innerHTML).toBe(withTailwind.stylesheet());
    expect(style?.innerHTML).toContain('--background:#fafafa');
    expect(style?.innerHTML).toContain('@theme inline{');
    expect(style?.innerHTML).toContain('--color-background:var(--background)');
  });
});
