import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provenance } from '../../src/components/Provenance';

describe('Provenance', () => {
  it('renders the text so it is present without JavaScript', () => {
    render(<Provenance text="Traces captured before and after." label="Cold type-check" />);
    expect(screen.getByText('Traces captured before and after.')).toBeDefined();
  });

  it('exposes an accessible toggle naming the metric', () => {
    render(<Provenance text="Traces captured." label="Cold type-check" />);
    expect(screen.getByRole('button', { name: /Cold type-check/i })).toBeDefined();
  });

  it('collapses and expands on click', () => {
    render(<Provenance text="Traces captured." label="Cold type-check" />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});
