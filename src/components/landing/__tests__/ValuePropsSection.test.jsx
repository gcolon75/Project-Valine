import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ValuePropsSection from '../ValuePropsSection';

describe('ValuePropsSection', () => {
  it('renders section heading', () => {
    render(<ValuePropsSection />);
    expect(screen.getByRole('heading', { level: 2, name: /Built for everyone in entertainment/i })).toBeInTheDocument();
  });

  it('renders three value cards', () => {
    render(<ValuePropsSection />);
    expect(screen.getByRole('heading', { level: 3, name: /Our Mission/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Our Community/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Our Promise/i })).toBeInTheDocument();
  });

  it('renders value descriptions', () => {
    render(<ValuePropsSection />);
    expect(screen.getByText(/Connect you with the right people/i)).toBeInTheDocument();
    expect(screen.getByText(/Real people building real careers/i)).toBeInTheDocument();
    expect(screen.getByText(/Give you the tools to share your work/i)).toBeInTheDocument();
  });
});
