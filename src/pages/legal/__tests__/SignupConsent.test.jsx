import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Join from '../../../pages/Join';

// Mock AuthContext
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    register: vi.fn(),
    devLogin: null,
    loading: false,
  }),
}));

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Join Page - Signup Consent Integration', () => {
  it('displays consent text on signup page', () => {
    renderWithRouter(<Join />);
    expect(screen.getByText(/By signing up, you agree to our/i)).toBeInTheDocument();
  });

  it('has Terms of Service link in consent text', () => {
    renderWithRouter(<Join />);
    const termsLink = screen.getByRole('link', { name: /Terms of Service/i });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute('href', '/legal/terms');
  });

  it('has Privacy Policy link in consent text', () => {
    renderWithRouter(<Join />);
    const privacyLink = screen.getByRole('link', { name: /Privacy Policy/i });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', '/legal/privacy');
  });

  it('consent text is visible before submit button', () => {
    const { container } = renderWithRouter(<Join />);
    const consentText = screen.getByText(/By signing up, you agree to our/i);
    const submitButton = screen.getByRole('button', { name: /Create Account/i });
    
    // Check that consent text appears in the DOM before the submit button
    const formElements = Array.from(container.querySelectorAll('form *'));
    const consentIndex = formElements.findIndex(el => el.textContent?.includes('By signing up'));
    const buttonIndex = formElements.findIndex(el => el.textContent?.includes('Create Account'));
    
    expect(consentIndex).toBeGreaterThan(-1);
    expect(buttonIndex).toBeGreaterThan(-1);
    expect(consentIndex).toBeLessThan(buttonIndex);
  });
});
