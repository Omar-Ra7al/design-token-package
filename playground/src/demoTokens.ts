import { defineTokens } from '../../src/defineTokens';

/**
 * Demo tokens for the playground.
 *
 * The base set doubles as the light theme; `dark` and `ocean` list only what
 * they change, and `ocean` also adds a color of its own.
 */
export const tokens = defineTokens({
  selector: 'class',
  defaultTheme: 'light',
  tailwind: {
    generateThemeInline: true,
  },
  tokens: {
    color: {
      background: 'oklch(1 0 0)',
      foreground: 'oklch(0.145 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.145 0 0)',
      primary: 'oklch(0% 0 0)',
      primaryForeground: 'oklch(0.985 0 0)',
      secondary: 'oklch(1 0 0)',
      secondaryForeground: 'oklch(0.205 0 0)',
      muted: 'oklch(0.97 0 0)',
      mutedForeground: 'oklch(0.556 0 0)',
      accent: '#004e92',
      accentForeground: 'oklch(1 0 0)',
      destructive: 'oklch(0.577 0.245 27.325)',
      border: 'oklch(0.922 0 0)',
      ring: 'oklch(0.708 0 0)',
    },

    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
    },

    radius: {
      sm: '4px',
      md: '0.625rem',
      lg: '12px',
    },

    font: {
      sans: 'system-ui, sans-serif',
      mono: 'ui-monospace, monospace',
    },

    text: {
      sm: '14px',
      md: '16px',
      lg: '20px',
    },
  },

  themes: {
    dark: {
      color: {
        background: 'oklch(0% 0 0)',
        foreground: 'oklch(100% 0.00011 271.152)',
        card: 'oklch(0.205 0 0)',
        cardForeground: 'oklch(0.985 0 0)',
        primary: 'oklch(100% 0.00011 271.152)',
        primaryForeground: 'oklch(0.205 0 0)',
        secondary: 'oklch(0% 0 0)',
        secondaryForeground: 'oklch(0.985 0 0)',
        muted: 'oklch(0.269 0 0)',
        mutedForeground: 'oklch(0.708 0 0)',
        destructive: 'oklch(0.704 0.191 22.216)',
        border: 'oklch(1 0 0 / 10%)',
        ring: 'oklch(0.556 0 0)',
      },
    },

    ocean: {
      color: {
        background: 'oklch(0.22 0.05 230)',
        foreground: 'oklch(0.95 0.02 200)',
        card: 'oklch(0.28 0.05 230)',
        cardForeground: 'oklch(0.95 0.02 200)',
        primary: 'oklch(0.85 0.1 195)',
        primaryForeground: 'oklch(0.2 0.05 230)',
        secondary: 'oklch(0.25 0.04 230)',
        secondaryForeground: 'oklch(0.95 0.02 200)',
        muted: 'oklch(0.32 0.04 230)',
        mutedForeground: 'oklch(0.75 0.04 200)',
        accent: '#06b6d4',
        accentForeground: 'oklch(0.15 0.04 230)',
        border: 'oklch(0.9 0.05 200 / 20%)',
        ring: 'oklch(0.7 0.12 195)',
        seafoam: 'oklch(0.88 0.08 175)',
      },
      spacing: {
        lg: '20px',
      },
      shadow: {
        card: '0 2px 12px oklch(0.1 0.05 230 / 0.5)',
      },
    },
  },
});

export type AppThemeName = keyof typeof tokens.themes;
