import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FinalCTASection from '../FinalCTASection';

describe('FinalCTASection', () => {
  const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('renders heading', () => {
    renderWithRouter(<FinalCTASection />);
    expect(screen.getByRole('heading', { level: 2, name: /Ready to get started\?/i })).toBeInTheDocument();
  });

  it('renders CTA button', () => {
    renderWithRouter(<FinalCTASection />);
    expect(screen.getByRole('link', { name: /Create a free account/i })).toBeInTheDocument();
  });

  it('CTA button links to join page', () => {
    renderWithRouter(<FinalCTASection />);
    const link = screen.getByRole('link', { name: /Create a free account/i });
    expect(link).toHaveAttribute('href', '/join');
  });
});
