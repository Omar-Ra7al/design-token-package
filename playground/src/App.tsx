import { Greeting, clamp, useToggle } from '@your-scope/package-template';

export function App() {
  const [on, toggle] = useToggle();
  const value = clamp(12, 0, 10);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', lineHeight: 1.5 }}>
      <h1>Package playground</h1>
      <p>
        Edit files in <code>src/</code> and see updates here.
      </p>

      <section>
        <h2>Component</h2>
        <Greeting name="Ada" size="lg" />
      </section>

      <section>
        <h2>Hook</h2>
        <p>Toggle is {on ? 'on' : 'off'}</p>
        <button type="button" onClick={toggle}>
          Toggle
        </button>
      </section>

      <section>
        <h2>Utility</h2>
        <p>
          <code>clamp(12, 0, 10)</code> → {value}
        </p>
      </section>
    </main>
  );
}
