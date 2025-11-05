import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card from '../Card';

describe('Card', () => {
  it('renders children content', () => {
    render(<Card>Test content</Card>);
    expect(screen.getByText(/test content/i)).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(<Card title="Card Title">Content</Card>);
    expect(screen.getByText(/card title/i)).toBeInTheDocument();
    expect(screen.getByText(/content/i)).toBeInTheDocument();
  });

  it('renders with actions', () => {
    const actions = <button>Action</button>;
    render(<Card title="Title" actions={actions}>Content</Card>);
    
    expect(screen.getByText(/title/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
  });

  it('applies hover styles when hover prop is true', () => {
    const { container } = render(<Card hover>Hover me</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('hover:shadow-lg');
  });

  it('does not apply hover styles when hover prop is false', () => {
    const { container } = render(<Card hover={false}>No hover</Card>);
    const card = container.firstChild;
    expect(card).not.toHaveClass('hover:shadow-lg');
  });

  it('applies different padding sizes', () => {
    const { container, rerender } = render(<Card padding="none">None</Card>);
    let card = container.firstChild;
    expect(card).not.toHaveClass('p-4', 'p-6', 'p-8');

    rerender(<Card padding="sm">Small</Card>);
    card = container.firstChild;
    expect(card).toHaveClass('p-4');

    rerender(<Card padding="default">Default</Card>);
    card = container.firstChild;
    expect(card).toHaveClass('p-6');

    rerender(<Card padding="lg">Large</Card>);
    card = container.firstChild;
    expect(card).toHaveClass('p-8');
  });

  it('uses surface tokens for background', () => {
    const { container } = render(<Card>Surface tokens</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('bg-surface-2');
  });

  it('has proper border and shadow', () => {
    const { container } = render(<Card>Styled card</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('border', 'border-subtle', 'shadow-sm', 'rounded-xl');
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Custom</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('custom-class');
  });

  it('renders as different component when as prop is provided', () => {
    render(<Card as="section" data-testid="section-card">Section card</Card>);
    const card = screen.getByTestId('section-card');
    expect(card.tagName).toBe('SECTION');
  });

  it('renders header with title and actions properly separated', () => {
    const actions = <button>Action</button>;
    render(
      <Card title="Test Title" actions={actions}>
        Content
      </Card>
    );
    
    const title = screen.getByText(/test title/i);
    const action = screen.getByRole('button', { name: /action/i });
    
    expect(title).toBeInTheDocument();
    expect(action).toBeInTheDocument();
  });
});
