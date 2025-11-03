// src/components/__tests__/Header.test.jsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import Header from '../Header';

describe('Header', () => {
  it('should render the app logo/brand', () => {
    renderWithProviders(<Header />);
    expect(screen.getByText('Valine')).toBeInTheDocument();
  });

  it('should render all navigation items', () => {
    renderWithProviders(<Header />);
    expect(screen.getByText('Feed')).toBeInTheDocument();
    expect(screen.getByText('Discover')).toBeInTheDocument();
    expect(screen.getByText('Post')).toBeInTheDocument();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('should have proper header structure', () => {
    renderWithProviders(<Header />);
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('sticky');
  });

  it('should have correct navigation links', () => {
    renderWithProviders(<Header />);
    expect(screen.getByText('Feed').closest('a')).toHaveAttribute('href', '/feed');
    expect(screen.getByText('Discover').closest('a')).toHaveAttribute('href', '/search');
    expect(screen.getByText('Post').closest('a')).toHaveAttribute('href', '/scripts/new');
    expect(screen.getByText('Inbox').closest('a')).toHaveAttribute('href', '/messages');
  });

  it('should have navigation styling', () => {
    renderWithProviders(<Header />, { initialRoute: '/feed' });
    const feedLink = screen.getByText('Feed');
    // Check that the link has font-medium class (part of base styling)
    expect(feedLink).toHaveClass('font-medium');
  });

  it('should apply dark mode styles correctly', () => {
    renderWithProviders(<Header />);
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('dark:bg-gray-900');
  });

  it('should be sticky at the top', () => {
    renderWithProviders(<Header />);
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('sticky', 'top-0');
  });
});
