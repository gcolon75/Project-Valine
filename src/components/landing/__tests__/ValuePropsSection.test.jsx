import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ValuePropsSection from '../ValuePropsSection';

describe('ValuePropsSection', () => {
  it('renders section heading', () => {
    render(<ValuePropsSection />);
    expect(screen.getByRole('heading', { level: 2, name: /Empowering voice actors/i })).toBeInTheDocument();
  });

  it('renders three value cards', () => {
    render(<ValuePropsSection />);
    expect(screen.getByRole('heading', { level: 3, name: /Our Mission/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Our Community/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Our Promise/i })).toBeInTheDocument();
  });

  it('renders value descriptions', () => {
    render(<ValuePropsSection />);
    expect(screen.getByText(/premier platform where voice actors can connect/i)).toBeInTheDocument();
    expect(screen.getByText(/diverse network of talented artists/i)).toBeInTheDocument();
    expect(screen.getByText(/tools and connections you need/i)).toBeInTheDocument();
  });
});
