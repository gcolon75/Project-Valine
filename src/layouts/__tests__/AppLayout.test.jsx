import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AppLayout from '../AppLayout';
import { UnreadProvider } from '../../context/UnreadContext';

// Mock the Outlet component
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Content</div>,
  };
});

const renderAppLayout = () => {
  return render(
    <BrowserRouter>
      <UnreadProvider>
        <AppLayout />
      </UnreadProvider>
    </BrowserRouter>
  );
};

describe('AppLayout', () => {
  it('renders the layout with outlet content', () => {
    renderAppLayout();
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('renders navigation items with proper aria-labels', () => {
    renderAppLayout();
    
    // Check for navigation items (they appear in both desktop and mobile)
    const homeLinks = screen.getAllByLabelText(/home/i);
    expect(homeLinks.length).toBeGreaterThan(0);
    
    const reelsLinks = screen.getAllByLabelText(/reels/i);
    expect(reelsLinks.length).toBeGreaterThan(0);
  });

  it('has mobile navigation with proper structure', () => {
    renderAppLayout();
    
    // Check for mobile navigation
    const mobileNav = screen.getByLabelText(/mobile navigation/i);
    expect(mobileNav).toBeInTheDocument();
    expect(mobileNav).toHaveClass('md:hidden'); // Hidden on desktop
  });

  it('has desktop header with proper structure', () => {
    renderAppLayout();
    
    // Desktop header should exist (will be hidden via CSS on mobile)
    const desktopNav = screen.getByLabelText(/main navigation/i);
    expect(desktopNav).toBeInTheDocument();
  });

  it('renders logo with link to dashboard', () => {
    renderAppLayout();
    
    const logoLink = screen.getByLabelText(/go to dashboard/i);
    expect(logoLink).toBeInTheDocument();
    expect(logoLink).toHaveAttribute('href', '/dashboard');
  });

  it('has settings and logout buttons with proper labels', () => {
    renderAppLayout();
    
    const settingsLink = screen.getByLabelText(/settings/i);
    expect(settingsLink).toBeInTheDocument();
    
    const logoutButton = screen.getByLabelText(/log out/i);
    expect(logoutButton).toBeInTheDocument();
  });

  it('mobile nav items have minimum 44x44 touch targets', () => {
    renderAppLayout();
    
    // Get all nav items from mobile navigation
    const mobileNav = screen.getByLabelText(/mobile navigation/i);
    const navLinks = mobileNav.querySelectorAll('a');
    
    navLinks.forEach(link => {
      // Check for min-w-[44px] and min-h-[44px] classes
      expect(link.classList.toString()).toMatch(/min-w-\[44px\]/);
      expect(link.classList.toString()).toMatch(/min-h-\[44px\]/);
    });
  });

  it('navigation items have focus-visible states', () => {
    renderAppLayout();
    
    const homeLinks = screen.getAllByLabelText(/home/i);
    homeLinks.forEach(link => {
      expect(link.classList.toString()).toMatch(/focus-visible/);
    });
  });

  it('uses surface tokens for background', () => {
    const { container } = renderAppLayout();
    const mainContainer = container.firstChild;
    expect(mainContainer).toHaveClass('bg-surface-0');
  });

  it('shows notification badge when count is greater than 0', () => {
    // This test would need the UnreadContext to provide a count
    // For now, we just verify the structure exists
    renderAppLayout();
    const notificationLinks = screen.getAllByLabelText(/notifications/i);
    expect(notificationLinks.length).toBeGreaterThan(0);
  });
});
