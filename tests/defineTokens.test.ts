import { describe, expect, it } from 'vitest';
import { defineTokens } from '../src/defineTokens';

const sample = defineTokens({
  selector: 'class',
  defaultTheme: 'light',

  tokens: {
    color: {
      background: '#ffffff',
      primary: 'oklch(0% 0 0)',
    },

    spacing: {
      md: '16px',
      lg: '24px',
    },

    custom: {
      navHeight: '4rem',
    },
  },

  themes: {
    dark: {
      color: {
        background: '#000000',
        primary: 'oklch(100% 0 0)',
      },
    },

    ocean: {
      color: {
        primary: 'oklch(0.85 0.1 195)',
        seafoam: 'oklch(0.88 0.08 175)',
      },
      custom: {
        navHeight: '5rem',
      },
    },
  },
});

/** Reads a single rule out of the generated stylesheet. */
function ruleFor(css: string, selector: string): string {
  const start = css.indexOf(`${selector}{`);
  return css.slice(start, css.indexOf('}', start) + 1);
}

describe('defineTokens', () => {
  it('exposes the default theme like any other theme', () => {
    expect(sample.themeNames).toEqual(['light', 'dark', 'ocean']);
    expect(sample.themes.light.color.primary).toBe('oklch(0% 0 0)');
    expect(sample.themes.ocean.spacing.lg).toBe('24px');
    expect(sample.themes.ocean.color.seafoam).toBe('oklch(0.88 0.08 175)');
  });

  it('emits bare variables for color and custom, prefixed ones elsewhere', () => {
    expect(ruleFor(sample.css(), ':root')).toBe(
      ':root{--background:#ffffff;--primary:oklch(0% 0 0);--spacing-md:16px;--spacing-lg:24px;--navHeight:4rem}',
    );
  });

  it('emits only the tokens a theme declares', () => {
    expect(ruleFor(sample.css(), '.dark')).toBe(
      '.dark{--background:#000000;--primary:oklch(100% 0 0)}',
    );
  });

  it('leaves partially overridden categories to inherit the rest from :root', () => {
    const ocean = ruleFor(sample.css(), '.ocean');

    expect(ocean).toBe(
      '.ocean{--primary:oklch(0.85 0.1 195);--seafoam:oklch(0.88 0.08 175);--navHeight:5rem}',
    );
    expect(ocean).not.toContain('--spacing-md');
    expect(ocean).not.toContain('--background');
  });

  it('does not emit a selector rule for the default theme', () => {
    expect(sample.css()).not.toContain('.light{');
    expect(sample.css()).toContain(':root{');
  });

  it('resolves get() from the theme, falling back to base tokens', () => {
    expect(sample.get('light', 'primary')).toBe('oklch(0% 0 0)');
    expect(sample.get('dark', 'background')).toBe('#000000');
    expect(sample.get('ocean', 'background')).toBe('#ffffff');
    expect(sample.get('ocean', 'spacing-lg')).toBe('24px');
    expect(sample.get('light', 'navHeight')).toBe('4rem');
    expect(sample.get('ocean', 'navHeight')).toBe('5rem');
  });

  it('mixes opacity refs into color-mix()', () => {
    expect(sample.get('light', 'primary/20')).toBe(
      'color-mix(in oklch, oklch(0% 0 0) 20%, transparent)',
    );
    expect(sample.var('primary/50')).toBe('color-mix(in oklch, var(--primary) 50%, transparent)');
  });

  it('builds var() references', () => {
    expect(sample.var('background')).toBe('var(--background)');
    expect(sample.var('spacing-md')).toBe('var(--spacing-md)');
    expect(sample.var('navHeight')).toBe('var(--navHeight)');
  });

  it('allows opacity on a color a theme introduces', () => {
    expect(sample.var('seafoam/25')).toBe('color-mix(in oklch, var(--seafoam) 25%, transparent)');
  });

  it('throws on unknown tokens and invalid opacity', () => {
    expect(() => sample.get('light', 'missing' as 'primary')).toThrow(/Unknown token/);
    expect(() => sample.get('light', 'primary/101' as 'primary/100')).toThrow(/Invalid opacity/);
    expect(() => sample.var('missing/50' as 'primary/50')).toThrow(/Unknown token/);
  });

  it('rejects opacity by category, not by variable name', () => {
    expect(() => sample.var('spacing-md/50' as 'primary/50')).toThrow(
      /only supported for "color".+is a "spacing" token/,
    );
    expect(() => sample.var('navHeight/50' as 'primary/50')).toThrow(
      /only supported for "color".+is a "custom" token/,
    );
  });

  it('throws when defaultTheme also appears in themes', () => {
    expect(() =>
      defineTokens({
        selector: 'class',
        defaultTheme: 'light',
        tokens: { color: { primary: '#000' } },
        themes: { light: {}, dark: {} },
      } as never),
    ).toThrow(/defaultTheme "light" must not also appear in themes/);
  });

  it('throws when two categories claim the same variable', () => {
    expect(() =>
      defineTokens({
        selector: 'class',
        defaultTheme: 'light',
        tokens: { color: { primary: '#000' }, custom: { primary: '4rem' } },
        themes: { dark: {} },
      }),
    ).toThrow(/"color.primary" and "custom.primary" compile to "--primary"/);

    expect(() =>
      defineTokens({
        selector: 'class',
        defaultTheme: 'light',
        tokens: { spacing: { md: '16px' } },
        themes: { dark: { custom: { 'spacing-md': '20px' } } },
      }),
    ).toThrow(/"spacing.md" and "custom.spacing-md" compile to "--spacing-md"/);
  });

  it('supports id and data-* selector strategies', () => {
    const config = {
      defaultTheme: 'light' as const,
      tokens: { color: { primary: '#000' } },
      themes: { dark: { color: { primary: '#fff' } } },
    };

    expect(defineTokens({ selector: 'id', ...config }).css()).toContain('#dark{--primary:#fff}');
    expect(defineTokens({ selector: 'data-theme', ...config }).css()).toContain(
      '[data-theme="dark"]{--primary:#fff}',
    );
    expect(() => defineTokens({ selector: 'attr' as 'class', ...config })).toThrow(
      /Invalid selector/,
    );
  });

  it('theme() is empty unless generateThemeInline is on', () => {
    expect(sample.theme()).toBe('');

    const withTailwind = defineTokens({
      selector: 'class',
      defaultTheme: 'light',
      tailwind: { generateThemeInline: true },
      tokens: {
        color: { primary: '#000', background: '#fff' },
        spacing: { md: '16px' },
        custom: { navHeight: '4rem' },
      },
      themes: {
        dark: {
          color: { primary: '#fff', seafoam: 'oklch(0.88 0.08 175)' },
          radius: { md: '0.5rem' },
        },
      },
    });

    expect(withTailwind.css()).not.toContain('@theme');
    expect(withTailwind.theme()).toContain(
      'If you already have a hand-written @theme inline { ... } in your CSS',
    );
    expect(withTailwind.theme()).toContain(
      '@theme inline{--color-background:var(--background);--color-primary:var(--primary);--color-seafoam:var(--seafoam);--radius-md:var(--radius-md);--spacing-md:var(--spacing-md)}',
    );
    expect(withTailwind.theme()).not.toContain('navHeight');
  });

  it('theme() is empty when enabled but only custom tokens exist', () => {
    const customOnly = defineTokens({
      selector: 'class',
      defaultTheme: 'light',
      tailwind: { generateThemeInline: true },
      tokens: { custom: { navHeight: '4rem' } },
      themes: { dark: {} },
    });

    expect(customOnly.theme()).toBe('');
  });
});
