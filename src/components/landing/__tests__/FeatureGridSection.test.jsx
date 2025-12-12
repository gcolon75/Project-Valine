import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeatureGridSection from '../FeatureGridSection';

describe('FeatureGridSection', () => {
  it('renders section heading', () => {
    render(<FeatureGridSection />);
    expect(screen.getByRole('heading', { level: 2, name: /Everything you need to succeed/i })).toBeInTheDocument();
  });

  it('renders main feature cards', () => {
    render(<FeatureGridSection />);
    expect(screen.getByRole('heading', { level: 3, name: /Connect with Industry Pros/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Share Your Work/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Find Opportunities/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Feedback & Revisions/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Monetize Your Craft/i })).toBeInTheDocument();
  });

  it('renders additional features section', () => {
    render(<FeatureGridSection />);
    expect(screen.getByRole('heading', { level: 3, name: /More Features/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: /Reels & Stories/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: /Premium Visibility & Analytics/i })).toBeInTheDocument();
  });
});
