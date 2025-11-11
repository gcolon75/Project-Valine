import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HeroSection from '../HeroSection';

describe('HeroSection', () => {
  const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('renders main heading', () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Connect. Create. Collaborate./i)).toBeInTheDocument();
  });

  it('renders tagline', () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByText(/The Professional Network for Voice Actors/i)).toBeInTheDocument();
  });

  it('renders CTA buttons', () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByRole('link', { name: /Get started with a free account/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Learn more about Project Valine/i })).toBeInTheDocument();
  });

  it('renders stat cards', () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByText(/10K\+/i)).toBeInTheDocument();
    expect(screen.getByText(/50K\+/i)).toBeInTheDocument();
    expect(screen.getByText(/5K\+/i)).toBeInTheDocument();
  });

  it('renders trending card', () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByText(/Trending Now/i)).toBeInTheDocument();
  });
});
