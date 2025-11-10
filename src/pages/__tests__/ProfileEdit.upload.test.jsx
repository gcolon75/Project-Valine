import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProfileEdit from '../ProfileEdit';
import { AuthContext } from '../../context/AuthContext';
import * as mediaService from '../../services/mediaService';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('../../services/profileService', () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  batchUpdateProfileLinks: vi.fn(),
}));

vi.mock('../../services/mediaService', () => ({
  uploadMedia: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock child components to simplify testing
vi.mock('../../components/ImageCropper', () => ({
  default: () => <div data-testid="image-cropper">Image Cropper</div>,
}));

vi.mock('../../components/MediaUploader', () => ({
  default: ({ onUpload, uploadType }) => (
    <div data-testid={`media-uploader-${uploadType}`}>
      <button
        onClick={() => {
          const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
          onUpload(file, vi.fn());
        }}
      >
        Upload {uploadType}
      </button>
    </div>
  ),
}));

vi.mock('../../components/SkillsTags', () => ({
  default: () => <div data-testid="skills-tags">Skills Tags</div>,
}));

vi.mock('../../components/ProfileLinksEditor', () => ({
  default: () => <div data-testid="profile-links-editor">Profile Links Editor</div>,
}));

describe('ProfileEdit - Media Upload Integration', () => {
  const mockUser = {
    id: 'user-123',
    displayName: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
    headline: 'Test headline',
    title: 'Test title',
  };

  const mockAuthContext = {
    user: mockUser,
    updateUser: vi.fn(),
    isAuthenticated: true,
  };

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <ProfileEdit />
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variable
    import.meta.env.VITE_ENABLE_PROFILE_LINKS_API = 'false';
  });

  describe('Banner Upload', () => {
    it('should upload banner successfully', async () => {
      const mockUploadResult = {
        media: {
          id: 'media-123',
          processedStatus: 'processing',
        },
      };

      mediaService.uploadMedia.mockResolvedValue(mockUploadResult);

      renderComponent();

      // Navigate to basic info section (should be default)
      const uploadButton = screen.getByText('Upload image');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mediaService.uploadMedia).toHaveBeenCalledWith(
          'user-123',
          expect.any(File),
          'image',
          expect.objectContaining({
            title: 'Profile Banner',
            privacy: 'public',
          })
        );
      });

      expect(toast.loading).toHaveBeenCalledWith('Uploading banner...');
      expect(toast.success).toHaveBeenCalledWith('Banner uploaded successfully!', {
        id: 'toast-id',
      });
    });

    it('should handle banner upload error', async () => {
      mediaService.uploadMedia.mockRejectedValue(new Error('Upload failed'));

      renderComponent();

      const uploadButton = screen.getByText('Upload image');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Upload failed', { id: 'toast-id' });
      });
    });

    it('should not upload if user is not logged in', async () => {
      const noUserContext = {
        user: null,
        updateUser: vi.fn(),
        isAuthenticated: false,
      };

      render(
        <BrowserRouter>
          <AuthContext.Provider value={noUserContext}>
            <ProfileEdit />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      const uploadButton = screen.getByText('Upload image');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('You must be logged in to upload media');
      });

      expect(mediaService.uploadMedia).not.toHaveBeenCalled();
    });
  });

  describe('Reel Upload', () => {
    it('should upload reel successfully', async () => {
      const mockUploadResult = {
        media: {
          id: 'media-456',
          processedStatus: 'processing',
        },
      };

      mediaService.uploadMedia.mockResolvedValue(mockUploadResult);

      renderComponent();

      // Navigate to media section
      const mediaTab = screen.getByText('Media');
      fireEvent.click(mediaTab);

      await waitFor(() => {
        expect(screen.getByText('Upload video')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Upload video');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mediaService.uploadMedia).toHaveBeenCalledWith(
          'user-123',
          expect.any(File),
          'video',
          expect.objectContaining({
            title: 'Demo Reel',
            privacy: 'public',
          })
        );
      });

      expect(toast.loading).toHaveBeenCalledWith('Uploading reel...');
      expect(toast.success).toHaveBeenCalledWith('Reel uploaded successfully!', {
        id: 'toast-id',
      });
    });

    it('should handle reel upload error', async () => {
      mediaService.uploadMedia.mockRejectedValue(new Error('Video too large'));

      renderComponent();

      // Navigate to media section
      const mediaTab = screen.getByText('Media');
      fireEvent.click(mediaTab);

      const uploadButton = screen.getByText('Upload video');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Video too large', { id: 'toast-id' });
      });
    });

    it('should respect reel privacy setting', async () => {
      const mockUploadResult = {
        media: {
          id: 'media-456',
          processedStatus: 'processing',
        },
      };

      mediaService.uploadMedia.mockResolvedValue(mockUploadResult);

      renderComponent();

      // Navigate to media section
      const mediaTab = screen.getByText('Media');
      fireEvent.click(mediaTab);

      // Change privacy setting
      const privacySelect = screen.getByDisplayValue('Public - Anyone can watch');
      fireEvent.change(privacySelect, { target: { value: 'private' } });

      const uploadButton = screen.getByText('Upload video');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mediaService.uploadMedia).toHaveBeenCalledWith(
          'user-123',
          expect.any(File),
          'video',
          expect.objectContaining({
            privacy: 'private',
            title: 'Private Reel',
          })
        );
      });
    });
  });

  describe('Upload Progress', () => {
    it('should track upload progress', async () => {
      let progressCallback;

      mediaService.uploadMedia.mockImplementation((profileId, file, type, options) => {
        progressCallback = options.onProgress;
        return Promise.resolve({ media: { id: 'media-123' } });
      });

      renderComponent();

      const uploadButton = screen.getByText('Upload image');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(progressCallback).toBeDefined();
      });

      // Simulate progress updates
      progressCallback(25);
      progressCallback(50);
      progressCallback(75);
      progressCallback(100);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });
    });
  });
});
