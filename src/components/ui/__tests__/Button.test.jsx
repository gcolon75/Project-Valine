import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../Button';

describe('Button', () => {
  it('renders with default variant', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('renders with primary variant', () => {
    render(<Button variant="primary">Primary</Button>);
    const button = screen.getByRole('button', { name: /primary/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('from-[#474747]', 'to-[#0CCE6B]');
  });

  it('renders with secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button', { name: /secondary/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-surface-2');
  });

  it('renders with ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole('button', { name: /ghost/i });
    expect(button).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
  });

  it('renders with start icon', () => {
    const Icon = () => <span data-testid="start-icon">Icon</span>;
    render(<Button startIcon={<Icon />}>With Icon</Button>);
    
    expect(screen.getByTestId('start-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /with icon/i })).toBeInTheDocument();
  });

  it('renders with end icon', () => {
    const Icon = () => <span data-testid="end-icon">Icon</span>;
    render(<Button endIcon={<Icon />}>With Icon</Button>);
    
    expect(screen.getByTestId('end-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /with icon/i })).toBeInTheDocument();
  });

  it('applies different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let button = screen.getByRole('button', { name: /small/i });
    expect(button).toHaveClass('min-h-[36px]');

    rerender(<Button size="md">Medium</Button>);
    button = screen.getByRole('button', { name: /medium/i });
    expect(button).toHaveClass('min-h-[44px]');

    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole('button', { name: /large/i });
    expect(button).toHaveClass('min-h-[48px]');
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button', { name: /custom/i });
    expect(button).toHaveClass('custom-class');
  });

  it('supports focus-visible styles', () => {
    render(<Button>Focus me</Button>);
    const button = screen.getByRole('button', { name: /focus me/i });
    expect(button).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-brand');
  });

  it('has minimum touch target of 44x44 for medium size', () => {
    render(<Button size="md">Touch Target</Button>);
    const button = screen.getByRole('button', { name: /touch target/i });
    expect(button).toHaveClass('min-h-[44px]');
  });
});
