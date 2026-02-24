import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from '../ThemeToggle';
import { ThemeProvider } from '../../context/ThemeContext';

describe('ThemeToggle', () => {
  const renderWithTheme = (initialTheme = 'light') => {
    return render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
  };

  it('should render theme toggle button', () => {
    renderWithTheme();
    
    const button = screen.getByRole('button', { name: /switch to (dark|light) mode/i });
    expect(button).toBeInTheDocument();
  });

  it('should show correct icon and text for light theme', () => {
    renderWithTheme('light');
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    
    // Should show "Dark mode" text when in light theme
    expect(button.textContent).toContain('Dark mode');
  });

  it('should toggle theme on click', async () => {
    const user = userEvent.setup();
    renderWithTheme();
    
    const button = screen.getByRole('button');
    
    // Initial state should be light (shows "Dark mode" text)
    expect(button.textContent).toContain('Dark mode');
    
    // Click to toggle
    await user.click(button);
    
    // After toggle, should show "Light mode" text
    expect(button.textContent).toContain('Light mode');
  });

  it('should have proper accessibility attributes in light mode', () => {
    renderWithTheme();
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
    expect(button).toHaveAttribute('title', 'Switch to dark mode');
  });

  it('should update aria-label after toggling to dark mode', async () => {
    const user = userEvent.setup();
    renderWithTheme();
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
    expect(button).toHaveAttribute('title', 'Switch to light mode');
  });

  it('should apply correct CSS classes', () => {
    renderWithTheme();
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('inline-flex');
    expect(button.className).toContain('items-center');
    expect(button.className).toContain('gap-2');
    expect(button.className).toContain('rounded-full');
  });
});
