import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Greeting } from '../src/components/Greeting';

describe('Greeting', () => {
  it('renders a greeting with the provided name', () => {
    render(<Greeting name="Ada" />);

    expect(screen.getByTestId('greeting')).toHaveTextContent('Hello, Ada!');
  });

  it('applies the default size', () => {
    render(<Greeting name="Ada" />);

    expect(screen.getByTestId('greeting')).toHaveAttribute('data-size', 'md');
  });
});
