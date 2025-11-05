// src/components/__tests__/ProfileLinksEditor.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileLinksEditor from '../ProfileLinksEditor';

describe('ProfileLinksEditor', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render empty state when no links', () => {
      render(<ProfileLinksEditor links={[]} onChange={mockOnChange} />);
      
      expect(screen.getByText(/No external links added yet/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add your first link/i })).toBeInTheDocument();
    });

    it('should render existing links', () => {
      const links = [
        { label: 'My Website', url: 'https://example.com', type: 'Website' },
        { label: 'IMDb Profile', url: 'https://imdb.com', type: 'IMDb' }
      ];
      
      render(<ProfileLinksEditor links={links} onChange={mockOnChange} />);
      
      expect(screen.getByDisplayValue('My Website')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('IMDb Profile')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://imdb.com')).toBeInTheDocument();
    });

    it('should show backend integration note', () => {
      render(<ProfileLinksEditor links={[]} onChange={mockOnChange} />);
      
      expect(screen.getByText(/Backend API integration pending/i)).toBeInTheDocument();
    });
  });

  describe('Adding Links', () => {
    it('should add a new link when clicking add button', async () => {
      const user = userEvent.setup();
      render(<ProfileLinksEditor links={[]} onChange={mockOnChange} />);
      
      const addButton = screen.getByRole('button', { name: /Add your first link/i });
      await user.click(addButton);
      
      expect(mockOnChange).toHaveBeenCalledWith([
        { label: '', url: '', type: 'Website' }
      ]);
    });

    it('should add another link when clicking "Add Another Link"', async () => {
      const user = userEvent.setup();
      const links = [
        { label: 'My Website', url: 'https://example.com', type: 'Website' }
      ];
      
      render(<ProfileLinksEditor links={links} onChange={mockOnChange} />);
      
      const addButton = screen.getByRole('button', { name: /Add another link/i });
      await user.click(addButton);
      
      expect(mockOnChange).toHaveBeenCalledWith([
        ...links,
        { label: '', url: '', type: 'Website' }
      ]);
    });

    it('should not add link when max links reached', () => {
      const links = Array.from({ length: 10 }, (_, i) => ({
        label: `Link ${i}`,
        url: `https://example${i}.com`,
        type: 'Website'
      }));
      
      render(<ProfileLinksEditor links={links} onChange={mockOnChange} maxLinks={10} />);
      
      expect(screen.queryByRole('button', { name: /Add another link/i })).not.toBeInTheDocument();
      expect(screen.getByText(/Maximum of 10 links reached/i)).toBeInTheDocument();
    });
  });

  describe('Removing Links', () => {
    it('should remove a link when clicking remove button', async () => {
      const user = userEvent.setup();
      const links = [
        { label: 'Website 1', url: 'https://example1.com', type: 'Website' },
        { label: 'Website 2', url: 'https://example2.com', type: 'Website' }
      ];
      
      render(<ProfileLinksEditor links={links} onChange={mockOnChange} />);
      
      const removeButtons = screen.getAllByRole('button', { name: /Remove link/i });
      await user.click(removeButtons[0]);
      
      expect(mockOnChange).toHaveBeenCalledWith([links[1]]);
    });
  });

  describe('Editing Links', () => {
    it('should update label when typing', async () => {
      const user = userEvent.setup();
      const links = [{ label: '', url: 'https://example.com', type: 'Website' }];
      
      render(<ProfileLinksEditor links={links} onChange={mockOnChange} />);
      
      const labelInput = screen.getByPlaceholderText('e.g., My Portfolio');
      await user.type(labelInput, 'T');
      
      // Check that onChange was called with the updated label (one character at a time)
      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1];
      expect(lastCall[0][0].label).toBe('T');
    });

    it('should update url when typing', async () => {
      const user = userEvent.setup();
      const links = [{ label: 'My Website', url: '', type: 'Website' }];
      
      render(<ProfileLinksEditor links={links} onChange={mockOnChange} />);
      
      const urlInput = screen.getByPlaceholderText('https://example.com');
      await user.type(urlInput, 'h');
      
      // Check that onChange was called with the updated url
      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1];
      expect(lastCall[0][0].url).toBe('h');
    });

    it('should update type when selecting', async () => {
      const user = userEvent.setup();
      const links = [{ label: 'My Link', url: 'https://example.com', type: 'Website' }];
      
      render(<ProfileLinksEditor links={links} onChange={mockOnChange} />);
      
      const typeSelect = screen.getByDisplayValue('Website');
      await user.selectOptions(typeSelect, 'IMDb');
      
      expect(mockOnChange).toHaveBeenLastCalledWith([
        { label: 'My Link', url: 'https://example.com', type: 'IMDb' }
      ]);
    });
  });

  describe('Validation', () => {
    it('should show validation hint for URL format', () => {
      const links = [{ label: 'My Website', url: '', type: 'Website' }];
      
      render(<ProfileLinksEditor links={links} onChange={mockOnChange} />);
      
      // Should show hint text by default
      expect(screen.getByText(/Must start with http:\/\/ or https:\/\//i)).toBeInTheDocument();
    });

    it('should call onChange when editing fields', async () => {
      const user = userEvent.setup();
      const links = [{ label: '', url: '', type: 'Website' }];
      
      render(<ProfileLinksEditor links={links} onChange={mockOnChange} />);
      
      const labelInput = screen.getByPlaceholderText('e.g., My Portfolio');
      await user.type(labelInput, 'Test');
      
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should show character count for label', () => {
      const links = [{ label: 'Test', url: 'https://example.com', type: 'Website' }];
      
      render(<ProfileLinksEditor links={links} onChange={mockOnChange} />);
      
      expect(screen.getByText('4/50 characters')).toBeInTheDocument();
    });

    it('should enforce label max length', async () => {
      const user = userEvent.setup();
      const links = [{ label: '', url: 'https://example.com', type: 'Website' }];
      
      render(<ProfileLinksEditor links={links} onChange={mockOnChange} />);
      
      const labelInput = screen.getByPlaceholderText('e.g., My Portfolio');
      const longLabel = 'a'.repeat(51);
      
      // maxLength attribute should prevent typing beyond 50 chars
      await user.type(labelInput, longLabel);
      
      // Input should be truncated to 50 chars
      const calls = mockOnChange.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall[0].label.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const links = [{ label: 'My Website', url: 'https://example.com', type: 'Website' }];
      
      render(<ProfileLinksEditor links={links} onChange={mockOnChange} />);
      
      expect(screen.getByRole('region', { name: 'External Links Editor' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Link 1' })).toBeInTheDocument();
    });

    it('should mark required fields', () => {
      const links = [{ label: '', url: '', type: 'Website' }];
      
      render(<ProfileLinksEditor links={links} onChange={mockOnChange} />);
      
      const labelInput = screen.getByPlaceholderText('e.g., My Portfolio');
      const urlInput = screen.getByPlaceholderText('https://example.com');
      
      expect(labelInput).toHaveAttribute('aria-required', 'true');
      expect(urlInput).toHaveAttribute('aria-required', 'true');
    });

    it('should have proper aria-describedby for hint text', () => {
      const links = [{ label: '', url: '', type: 'Website' }];
      
      render(<ProfileLinksEditor links={links} onChange={mockOnChange} />);
      
      const urlInput = screen.getByPlaceholderText('https://example.com');
      const describedById = urlInput.getAttribute('aria-describedby');
      
      expect(describedById).toBeTruthy();
    });
  });

  describe('Drag and Drop', () => {
    it('should support draggable links', () => {
      const links = [
        { label: 'Link 1', url: 'https://example1.com', type: 'Website' },
        { label: 'Link 2', url: 'https://example2.com', type: 'Website' }
      ];
      
      render(<ProfileLinksEditor links={links} onChange={mockOnChange} />);
      
      const linkGroups = screen.getAllByRole('group');
      expect(linkGroups[0]).toHaveAttribute('draggable', 'true');
      expect(linkGroups[1]).toHaveAttribute('draggable', 'true');
    });
  });

  describe('Link Types', () => {
    it('should support all common link types', () => {
      const links = [{ label: 'Test', url: 'https://example.com', type: 'Website' }];
      
      render(<ProfileLinksEditor links={links} onChange={mockOnChange} />);
      
      const typeSelect = screen.getByDisplayValue('Website');
      const options = within(typeSelect).getAllByRole('option');
      
      const expectedTypes = [
        'Website', 'Portfolio', 'IMDb', 'LinkedIn', 'Twitter',
        'Instagram', 'YouTube', 'Vimeo', 'SoundCloud', 'Other'
      ];
      
      expect(options).toHaveLength(expectedTypes.length);
      options.forEach((option, index) => {
        expect(option.textContent).toBe(expectedTypes[index]);
      });
    });
  });
});
