import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PrivacyPolicy from '../PrivacyPolicy';
import TermsOfService from '../TermsOfService';
import CookieDisclosure from '../CookieDisclosure';

// Helper to wrap components with router
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Legal Pages - Privacy Policy', () => {
  it('renders the privacy policy page', () => {
    renderWithRouter(<PrivacyPolicy />);
    expect(screen.getByRole('heading', { level: 1, name: /Privacy Policy/i })).toBeInTheDocument();
  });

  it('displays MVP disclaimer', () => {
    renderWithRouter(<PrivacyPolicy />);
    expect(screen.getByText(/MVP - Subject to Legal Counsel Review/i)).toBeInTheDocument();
  });

  it('contains Data Collection section', () => {
    renderWithRouter(<PrivacyPolicy />);
    expect(screen.getByText(/Data Collection/i)).toBeInTheDocument();
    expect(screen.getByText(/Account Information/i)).toBeInTheDocument();
  });

  it('contains User Rights section', () => {
    renderWithRouter(<PrivacyPolicy />);
    expect(screen.getByText(/User Rights/i)).toBeInTheDocument();
    expect(screen.getByText(/Access & Export/i)).toBeInTheDocument();
  });

  it('contains Security Measures section', () => {
    renderWithRouter(<PrivacyPolicy />);
    expect(screen.getByText(/Security Measures/i)).toBeInTheDocument();
    // Use getAllBy for elements that appear multiple times
    const httpOnlyCookies = screen.getAllByText(/HttpOnly Cookies/i);
    expect(httpOnlyCookies.length).toBeGreaterThan(0);
  });

  it('contains Cookies section', () => {
    renderWithRouter(<PrivacyPolicy />);
    // Use getAllByText since "Cookies" appears multiple times
    const cookieElements = screen.getAllByText(/Cookies/i);
    expect(cookieElements.length).toBeGreaterThan(0);
  });

  it('contains contact information', () => {
    renderWithRouter(<PrivacyPolicy />);
    expect(screen.getByText(/Contact Information/i)).toBeInTheDocument();
    const privacyEmails = screen.getAllByText(/privacy@projectvaline.com/i);
    expect(privacyEmails.length).toBeGreaterThan(0);
  });

  it('has links to other legal pages', () => {
    renderWithRouter(<PrivacyPolicy />);
    const termsLinks = screen.getAllByRole('link', { name: /Terms of Service/i });
    const cookieLinks = screen.getAllByRole('link', { name: /Cookie/i });
    expect(termsLinks.length).toBeGreaterThan(0);
    expect(cookieLinks.length).toBeGreaterThan(0);
  });

  it('has back to home link', () => {
    renderWithRouter(<PrivacyPolicy />);
    expect(screen.getByRole('link', { name: /Back to Home/i })).toBeInTheDocument();
  });
});

describe('Legal Pages - Terms of Service', () => {
  it('renders the terms of service page', () => {
    renderWithRouter(<TermsOfService />);
    expect(screen.getByRole('heading', { level: 1, name: /Terms of Service/i })).toBeInTheDocument();
  });

  it('displays MVP disclaimer', () => {
    renderWithRouter(<TermsOfService />);
    expect(screen.getByText(/MVP - Subject to Legal Counsel Review/i)).toBeInTheDocument();
  });

  it('contains Acceptance of Terms section', () => {
    renderWithRouter(<TermsOfService />);
    expect(screen.getByText(/Acceptance of Terms/i)).toBeInTheDocument();
  });

  it('contains User Responsibilities section', () => {
    renderWithRouter(<TermsOfService />);
    expect(screen.getByText(/User Responsibilities/i)).toBeInTheDocument();
  });

  it('contains Prohibited Conduct section', () => {
    renderWithRouter(<TermsOfService />);
    const prohibitedText = screen.getAllByText(/Prohibited Conduct/i);
    expect(prohibitedText.length).toBeGreaterThan(0);
  });

  it('contains Intellectual Property section', () => {
    renderWithRouter(<TermsOfService />);
    const ipText = screen.getAllByText(/Intellectual Property/i);
    expect(ipText.length).toBeGreaterThan(0);
  });

  it('contains Account Termination section', () => {
    renderWithRouter(<TermsOfService />);
    expect(screen.getByText(/Account Termination/i)).toBeInTheDocument();
  });

  it('contains Limitation of Liability section', () => {
    renderWithRouter(<TermsOfService />);
    expect(screen.getByText(/Limitation of Liability/i)).toBeInTheDocument();
  });

  it('contains contact information', () => {
    renderWithRouter(<TermsOfService />);
    expect(screen.getByText(/Contact Information/i)).toBeInTheDocument();
    const supportEmails = screen.getAllByText(/support@projectvaline.com/i);
    expect(supportEmails.length).toBeGreaterThan(0);
  });

  it('has links to other legal pages', () => {
    renderWithRouter(<TermsOfService />);
    const privacyLinks = screen.getAllByRole('link', { name: /Privacy Policy/i });
    const cookieLinks = screen.getAllByRole('link', { name: /Cookie/i });
    expect(privacyLinks.length).toBeGreaterThan(0);
    expect(cookieLinks.length).toBeGreaterThan(0);
  });

  it('has back to home link', () => {
    renderWithRouter(<TermsOfService />);
    expect(screen.getByRole('link', { name: /Back to Home/i })).toBeInTheDocument();
  });
});

describe('Legal Pages - Cookie Disclosure', () => {
  it('renders the cookie disclosure page', () => {
    renderWithRouter(<CookieDisclosure />);
    expect(screen.getByRole('heading', { level: 1, name: /Cookie & Session Disclosure/i })).toBeInTheDocument();
  });

  it('displays MVP disclaimer', () => {
    renderWithRouter(<CookieDisclosure />);
    expect(screen.getByText(/MVP - Subject to Legal Counsel Review/i)).toBeInTheDocument();
  });

  it('contains explanation of what cookies are', () => {
    renderWithRouter(<CookieDisclosure />);
    expect(screen.getByText(/What Are Cookies/i)).toBeInTheDocument();
  });

  it('contains Cookies We Use section', () => {
    renderWithRouter(<CookieDisclosure />);
    expect(screen.getByText(/Cookies We Use/i)).toBeInTheDocument();
  });

  it('lists Access Token cookie details', () => {
    renderWithRouter(<CookieDisclosure />);
    const accessTokens = screen.getAllByText(/Access Token/i);
    expect(accessTokens.length).toBeGreaterThan(0);
    const httpOnly = screen.getAllByText(/HttpOnly/i);
    expect(httpOnly.length).toBeGreaterThan(0);
  });

  it('lists Refresh Token cookie details', () => {
    renderWithRouter(<CookieDisclosure />);
    const refreshTokens = screen.getAllByText(/Refresh Token/i);
    expect(refreshTokens.length).toBeGreaterThan(0);
  });

  it('lists XSRF-TOKEN cookie details', () => {
    renderWithRouter(<CookieDisclosure />);
    const xsrfTokens = screen.getAllByText(/XSRF-TOKEN/i);
    expect(xsrfTokens.length).toBeGreaterThan(0);
    const csrfProtection = screen.getAllByText(/CSRF Protection/i);
    expect(csrfProtection.length).toBeGreaterThan(0);
  });

  it('mentions analytics cookies are disabled', () => {
    renderWithRouter(<CookieDisclosure />);
    const analyticsCookies = screen.getAllByText(/Analytics Cookies/i);
    expect(analyticsCookies.length).toBeGreaterThan(0);
    const disabled = screen.getAllByText(/Currently Disabled|Disabled/i);
    expect(disabled.length).toBeGreaterThan(0);
  });

  it('contains Security Rationale section', () => {
    renderWithRouter(<CookieDisclosure />);
    const securityRationale = screen.getAllByText(/Security Rationale/i);
    expect(securityRationale.length).toBeGreaterThan(0);
  });

  it('contains Opt-Out section', () => {
    renderWithRouter(<CookieDisclosure />);
    const optOut = screen.getAllByText(/Opt-Out/i);
    expect(optOut.length).toBeGreaterThan(0);
  });

  it('contains contact information', () => {
    renderWithRouter(<CookieDisclosure />);
    const questions = screen.getAllByText(/Questions/i);
    expect(questions.length).toBeGreaterThan(0);
    const privacyEmails = screen.getAllByText(/privacy@projectvaline.com/i);
    expect(privacyEmails.length).toBeGreaterThan(0);
  });

  it('has links to other legal pages', () => {
    renderWithRouter(<CookieDisclosure />);
    const privacyLinks = screen.getAllByRole('link', { name: /Privacy Policy/i });
    const termsLinks = screen.getAllByRole('link', { name: /Terms of Service/i });
    expect(privacyLinks.length).toBeGreaterThan(0);
    expect(termsLinks.length).toBeGreaterThan(0);
  });

  it('has back to home link', () => {
    renderWithRouter(<CookieDisclosure />);
    expect(screen.getByRole('link', { name: /Back to Home/i })).toBeInTheDocument();
  });
});

describe('Legal Pages - Required Sections (Regex Validation)', () => {
  it('Privacy Policy contains all required sections', () => {
    const { container } = renderWithRouter(<PrivacyPolicy />);
    const text = container.textContent;
    
    // Required sections per problem statement
    expect(text).toMatch(/Data Collection/i);
    expect(text).toMatch(/User Rights/i);
    expect(text).toMatch(/Security Measures/i);
    expect(text).toMatch(/Cookies/i);
  });

  it('Terms of Service contains all required sections', () => {
    const { container } = renderWithRouter(<TermsOfService />);
    const text = container.textContent;
    
    // Required sections
    expect(text).toMatch(/Acceptance/i);
    expect(text).toMatch(/User Responsibilities/i);
    expect(text).toMatch(/Prohibited Conduct/i);
    expect(text).toMatch(/Intellectual Property/i);
    expect(text).toMatch(/Termination/i);
  });

  it('Cookie Disclosure contains all required sections', () => {
    const { container } = renderWithRouter(<CookieDisclosure />);
    const text = container.textContent;
    
    // Required sections
    expect(text).toMatch(/Cookies/i);
    expect(text).toMatch(/Security/i);
    expect(text).toMatch(/HttpOnly/i);
    expect(text).toMatch(/CSRF/i);
  });
});
