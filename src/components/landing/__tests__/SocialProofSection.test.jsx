import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SocialProofSection from '../SocialProofSection';

describe('SocialProofSection', () => {
  it('renders without errors (section is temporarily disabled)', () => {
    const { container } = render(<SocialProofSection />);
    // Section is temporarily disabled for marketing release
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });
});
