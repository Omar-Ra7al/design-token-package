import { afterEach, describe, expect, it } from 'vitest';
import { defineTokens } from '../src/defineTokens';
import { injectTokens } from '../src/injectTokens';

const tokens = defineTokens({
  selector: 'class',
  defaultTheme: 'light',
  tokens: {
    color: { primary: '#000' },
  },
  themes: {
    dark: { color: { primary: '#fff' } },
  },
});

afterEach(() => {
  document.head.querySelectorAll('style[data-design-tokens]').forEach((el) => el.remove());
});

describe('injectTokens', () => {
  it('injects tokens.stylesheet() when tailwind() is empty', () => {
    injectTokens(tokens);

    const style = document.head.querySelector('style[data-design-tokens]');
    expect(style?.textContent).toBe(tokens.stylesheet());
    expect(style?.textContent).not.toContain('@theme');
  });

  it('appends tokens.tailwind() when generateThemeInline is on', () => {
    const withTailwind = defineTokens({
      selector: 'class',
      defaultTheme: 'light',
      tailwind: { generateThemeInline: true },
      tokens: { color: { primary: '#000' } },
      themes: { dark: { color: { primary: '#fff' } } },
    });

    injectTokens(withTailwind);

    const style = document.head.querySelector('style[data-design-tokens]');
    expect(style?.textContent).toBe(withTailwind.stylesheet());
    expect(style?.textContent).toContain('@theme inline{');
    expect(style?.textContent).toContain('--color-primary:var(--primary)');
  });
});
