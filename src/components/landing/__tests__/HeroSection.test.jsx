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
    expect(screen.getByText(/Showcase your work. Connect with artists. Collaborate and grow./i)).toBeInTheDocument();
  });

  it('renders founder story', () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByText(/Actors, Writers, Influencers, Musicians, and Producers/i)).toBeInTheDocument();
    expect(screen.getByText(/safe, secure platform built for entertainment professionals/i)).toBeInTheDocument();
  });

  it('renders CTA buttons', () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByRole('link', { name: /Sign up for a free account/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Learn more about Joint/i })).toBeInTheDocument();
  });

  it('has hero section with proper anchor id', () => {
    renderWithRouter(<HeroSection />);
    const section = document.querySelector('#hero');
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('aria-labelledby', 'hero-heading');
  });
});
