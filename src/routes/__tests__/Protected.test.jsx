// src/routes/__tests__/Protected.test.jsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter, Navigate } from 'react-router-dom';
import { createMockUser } from '../../test/utils';

// Simplified Protected component test (without full routing)
function Protected({ children, user }) {
  if (!user) return <Navigate to="/login" replace />;
  if (!user.profileComplete) {
    return <Navigate to="/setup" replace />;
  }
  return children;
}

describe('Protected Route Component Logic', () => {
  it('should handle unauthenticated user (logic test)', () => {
    const result = Protected({ children: <div>Protected Content</div>, user: null });
    // Protected component returns Navigate component when user is null
    expect(result.type).toBe(Navigate);
    expect(result.props.to).toBe('/login');
  });

  it('should handle authenticated user with complete profile', () => {
    const user = createMockUser({ profileComplete: true });
    const result = Protected({ children: <div>Protected Content</div>, user });
    // Should render children
    expect(result.props.children).toBe('Protected Content');
  });

  it('should redirect to setup when profile is incomplete (logic test)', () => {
    const user = createMockUser({ profileComplete: false });
    const result = Protected({ children: <div>Protected Content</div>, user });
    // Should return Navigate to setup
    expect(result.type).toBe(Navigate);
    expect(result.props.to).toBe('/setup');
  });

  it('should pass replace prop to Navigate', () => {
    const result = Protected({ children: <div>Content</div>, user: null });
    expect(result.props.replace).toBe(true);
  });

  it('should handle complete user profile correctly', () => {
    const user = createMockUser({ 
      profileComplete: true,
      username: 'testuser',
      email: 'test@example.com'
    });
    const result = Protected({ children: <div>Dashboard</div>, user });
    // Should render the children directly
    expect(result.type).toBe('div');
    expect(result.props.children).toBe('Dashboard');
  });

  it('should check profileComplete property', () => {
    const incompleteUser = createMockUser({ profileComplete: false });
    const completeUser = createMockUser({ profileComplete: true });
    
    const incompleteResult = Protected({ children: <div>Content</div>, user: incompleteUser });
    const completeResult = Protected({ children: <div>Content</div>, user: completeUser });
    
    // Incomplete should redirect to setup
    expect(incompleteResult.props.to).toBe('/setup');
    // Complete should render content
    expect(completeResult.type).toBe('div');
  });
});
