// src/components/__tests__/Modal.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../Modal';

describe('Modal', () => {
  it('should not render when open is false', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()}>
        <div>Modal Content</div>
      </Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render when open is true', () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        <div>Modal Content</div>
      </Modal>
    );
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('should render children', () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        <h1>Test Title</h1>
        <p>Test paragraph</p>
      </Modal>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test paragraph')).toBeInTheDocument();
  });

  it('should call onClose when clicking backdrop', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose}>
        <div>Modal Content</div>
      </Modal>
    );
    
    // Click the backdrop (not the modal content)
    const backdrop = screen.getByText('Modal Content').parentElement.parentElement;
    fireEvent.click(backdrop);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when clicking modal content', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose}>
        <div>Modal Content</div>
      </Modal>
    );
    
    // Click the modal content
    const content = screen.getByText('Modal Content');
    fireEvent.click(content);
    
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should close on Escape key', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose}>
        <div>Modal Content</div>
      </Modal>
    );
    
    fireEvent.keyDown(window, { key: 'Escape' });
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not close on other keys', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose}>
        <div>Modal Content</div>
      </Modal>
    );
    
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'a' });
    
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should cleanup event listener on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <Modal open={true} onClose={onClose}>
        <div>Modal Content</div>
      </Modal>
    );
    
    unmount();
    
    // After unmount, Escape should not trigger onClose
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
