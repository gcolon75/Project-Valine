import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SocialProofSection from '../SocialProofSection';

describe('SocialProofSection', () => {
  it('renders section heading', () => {
    render(<SocialProofSection />);
    expect(screen.getByRole('heading', { level: 2, name: /Loved by creators everywhere/i })).toBeInTheDocument();
  });

  it('renders testimonials', () => {
    render(<SocialProofSection />);
    expect(screen.getByText(/Sarah Johnson/i)).toBeInTheDocument();
    expect(screen.getByText(/Michael Chen/i)).toBeInTheDocument();
    expect(screen.getByText(/Emily Rodriguez/i)).toBeInTheDocument();
  });

  it('renders testimonial quotes', () => {
    render(<SocialProofSection />);
    expect(screen.getByText(/completely changed how I connect/i)).toBeInTheDocument();
    expect(screen.getByText(/platform built for the entertainment community/i)).toBeInTheDocument();
  });
});
