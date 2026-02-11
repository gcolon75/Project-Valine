import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FAQSection from '../FAQSection';

describe('FAQSection', () => {
  it('renders section heading', () => {
    render(<FAQSection />);
    expect(screen.getByRole('heading', { level: 2, name: /Frequently Asked Questions/i })).toBeInTheDocument();
  });

  it('renders FAQ questions', () => {
    render(<FAQSection />);
    expect(screen.getByText(/What is Joint\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Is Joint free to use\?/i)).toBeInTheDocument();
    expect(screen.getByText(/How do I get started\?/i)).toBeInTheDocument();
  });

  it('expands FAQ answer when clicked', () => {
    render(<FAQSection />);
    const question = screen.getByText(/What is Joint\?/i);
    
    // Answer should not be visible initially
    expect(screen.queryByText(/where people in entertainment connect/i)).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(question);
    
    // Answer should now be visible
    expect(screen.getByText(/where people in entertainment connect/i)).toBeInTheDocument();
  });

  it('collapses FAQ answer when clicked again', () => {
    render(<FAQSection />);
    const question = screen.getByText(/What is Joint\?/i);
    
    // Expand
    fireEvent.click(question);
    expect(screen.getByText(/where people in entertainment connect/i)).toBeInTheDocument();
    
    // Collapse
    fireEvent.click(question);
    expect(screen.queryByText(/where people in entertainment connect/i)).not.toBeInTheDocument();
  });
});
