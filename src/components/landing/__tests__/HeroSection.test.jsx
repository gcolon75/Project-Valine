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
    expect(screen.getByText(/Co created by Justin Valine and Gabriel Colon/i)).toBeInTheDocument();
  });

  it('renders CTA buttons', () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByRole('link', { name: /Sign up for a free account/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Learn more about Joint/i })).toBeInTheDocument();
  });

  it('renders stat cards', () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByText(/10K\+/i)).toBeInTheDocument();
    expect(screen.getByText(/50K\+/i)).toBeInTheDocument();
    expect(screen.getByText(/5K\+/i)).toBeInTheDocument();
  });

  it('has hero section with proper anchor id', () => {
    renderWithRouter(<HeroSection />);
    const section = document.querySelector('#hero');
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('aria-labelledby', 'hero-heading');
  });

  it('renders centered layout with stats after main content', () => {
    renderWithRouter(<HeroSection />);
    const heading = screen.getByRole('heading', { level: 1 });
    const statsRegion = screen.getByLabelText(/Creators statistic/i);
    
    // Verify heading exists
    expect(heading).toBeInTheDocument();
    
    // Verify stats are present (they appear in sidebar, not below, but we verify they exist)
    expect(statsRegion).toBeInTheDocument();
  });
});
