import { useEffect, useState } from 'react';
import { TokenSheet } from '../../src/react';
import { tokens, type AppThemeName } from './demoTokens';

export function App() {
  const [theme, setTheme] = useState<AppThemeName>('light');

  useEffect(() => {
    const root = document.documentElement;

    for (const name of tokens.themeNames) {
      root.classList.toggle(name, name === theme);
    }
  }, [theme]);

  return (
    <>
      <TokenSheet tokens={tokens} />
      <main
        style={{
          fontFamily: tokens.var('font-sans'),
          padding: '2rem',
          lineHeight: 1.5,
          minHeight: '100vh',
          background: tokens.var('color-background'),
          color: tokens.var('color-foreground'),
        }}
      >
        <h1>Design token playground</h1>
        <p>
          Consumer-owned tokens via <code>defineTokens</code>. <code>TokenSheet</code> injects CSS
          variables; switch themes with class names on <code>&lt;html&gt;</code>.
        </p>

        <section style={{ marginTop: '1.5rem' }}>
          <h2>Theme</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {tokens.themeNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTheme(name)}
                style={{
                  padding: '0.5rem 0.75rem',
                  border: `1px solid ${tokens.var('color-border')}`,
                  borderRadius: tokens.var('radius-md'),
                  background:
                    theme === name ? tokens.var('color-primary') : tokens.var('color-secondary'),
                  color:
                    theme === name
                      ? tokens.var('color-primaryForeground')
                      : tokens.var('color-secondaryForeground'),
                  cursor: 'pointer',
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </section>

        <section style={{ marginTop: '1.5rem' }}>
          <h2>API demos</h2>
          <ul>
            <li>
              <code>tokens.get(&quot;light&quot;, &quot;color-primary&quot;)</code> →{' '}
              <code>{tokens.get('light', 'color-primary')}</code>
            </li>
            <li>
              <code>tokens.get(&quot;dark&quot;, &quot;color-primary/20&quot;)</code> →{' '}
              <code>{tokens.get('dark', 'color-primary/20')}</code>
            </li>
            <li>
              <code>tokens.get(&quot;dark&quot;, &quot;text-lg&quot;)</code> →{' '}
              <code>{tokens.get('dark', 'text-lg')}</code>
            </li>
            <li>
              <code>tokens.get(&quot;ocean&quot;, &quot;color-seafoam&quot;)</code> →{' '}
              <code>{tokens.get('ocean', 'color-seafoam')}</code>
            </li>
            <li>
              <code>tokens.get(&quot;ocean&quot;, &quot;shadow-card&quot;)</code> →{' '}
              <code>{tokens.get('ocean', 'shadow-card')}</code>
            </li>
            <li>
              <code>tokens.var(&quot;color-accent/50&quot;)</code> →{' '}
              <code>{tokens.var('color-accent/50')}</code>
            </li>
          </ul>
        </section>

        <section
          style={{
            marginTop: '1.5rem',
            padding: tokens.var('spacing-lg'),
            borderRadius: tokens.var('radius-md'),
            background: tokens.var('color-card'),
            color: tokens.var('color-cardForeground'),
            border: `1px solid ${tokens.var('color-border')}`,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Live surface</h2>
          <p style={{ marginBottom: 0 }}>
            Background uses <code>var(--color-background)</code> from the active theme. Accent
            swatch:{' '}
            <span
              style={{
                display: 'inline-block',
                width: '1.25rem',
                height: '1.25rem',
                verticalAlign: 'middle',
                borderRadius: tokens.var('radius-sm'),
                background: tokens.var('color-accent'),
              }}
            />
          </p>
        </section>
      </main>
    </>
  );
}
