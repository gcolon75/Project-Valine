import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MarketingFooter from '../../../components/MarketingFooter';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('MarketingFooter - Legal Links Integration', () => {
  it('renders Legal column heading', () => {
    renderWithRouter(<MarketingFooter />);
    expect(screen.getByText('Legal')).toBeInTheDocument();
  });

  it('has Privacy Policy link', () => {
    renderWithRouter(<MarketingFooter />);
    const privacyLink = screen.getByRole('link', { name: /Privacy Policy/i });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', '/legal/privacy');
  });

  it('has Terms of Service link', () => {
    renderWithRouter(<MarketingFooter />);
    const termsLink = screen.getByRole('link', { name: /Terms of Service/i });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute('href', '/legal/terms');
  });

  it('legal links are not disabled', () => {
    renderWithRouter(<MarketingFooter />);
    const privacyLink = screen.getByRole('link', { name: /Privacy Policy/i });
    const termsLink = screen.getByRole('link', { name: /Terms of Service/i });
    
    // Check they are actual links (not just spans with cursor-not-allowed)
    expect(privacyLink.tagName).toBe('A');
    expect(termsLink.tagName).toBe('A');
  });
});
