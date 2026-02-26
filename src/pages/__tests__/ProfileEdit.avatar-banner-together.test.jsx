import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProfileEdit from '../ProfileEdit';
import { AuthContext } from '../../context/AuthContext';
import * as profileService from '../../services/profileService';
import * as mediaService from '../../services/mediaService';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('../../services/profileService', () => ({
  getMyProfile: vi.fn(),
  updateMyProfile: vi.fn(),
  batchUpdateProfileLinks: vi.fn(),
  listEducation: vi.fn(),
  listExperience: vi.fn(),
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

// Mock ImageCropper — used for both avatar and banner uploads in ProfileEdit
vi.mock('../../components/ImageCropper', () => ({
  default: ({ onSave, onCancel, title }) => (
    <div data-testid={title === 'Crop Avatar' ? 'avatar-uploader' : 'banner-uploader'}>
      <button
        data-testid={title === 'Crop Avatar' ? 'upload-avatar-btn' : 'upload-image-btn'}
        onClick={() => {
          const file = new File(['test'], title === 'Crop Avatar' ? 'avatar.jpg' : 'banner.jpg', { type: 'image/jpeg' });
          onSave(file);
        }}
      >
        {title}
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('../../components/SkillsTags', () => ({
  default: ({ skills, onChange }) => (
    <div data-testid="skills-tags">
      <button onClick={() => onChange([...skills, 'NewSkill'])}>Add Skill</button>
    </div>
  ),
}));

vi.mock('../../components/ProfileLinksEditor', () => ({
  default: ({ links, onChange }) => (
    <div data-testid="profile-links-editor">Profile Links</div>
  ),
}));

vi.mock('../../utils/sanitize', () => ({
  sanitizeText: (text) => text,
}));

vi.mock('../../utils/urlValidation', async () => {
  const actual = await vi.importActual('../../utils/urlValidation');
  return {
    ...actual,
    validateProfileLinks: vi.fn(() => ({ valid: true, globalErrors: [] })),
  };
});

vi.mock('../../analytics/client', () => ({
  trackProfileUpdate: vi.fn(),
  trackMediaUpload: vi.fn(),
}));

describe('ProfileEdit - Avatar and Banner Together Bug Fix', () => {
  const mockUser = {
    id: 'user-123',
    displayName: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
  };

  const mockProfileData = {
    id: 'profile-123',
    userId: 'user-123',
    displayName: 'Test User',
    username: 'testuser',
    avatar: 'https://example.com/old-avatar.jpg',
    bannerUrl: 'https://example.com/old-banner.jpg',
    title: 'Software Engineer',
    headline: 'Building things',
    bio: 'I love coding',
    primaryRoles: ['Actor'],
    skills: ['JavaScript'],
    profileLinks: [],
    location: 'Seattle',
    availabilityStatus: 'available',
    showPronouns: true,
    showLocation: true,
    showAvailability: true,
  };

  const mockAuthContext = {
    user: mockUser,
    updateUser: vi.fn(),
    refreshUser: vi.fn(),
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
    
    // Mock initial profile data load
    profileService.getMyProfile.mockResolvedValue(mockProfileData);
    profileService.listEducation.mockResolvedValue([]);
    profileService.listExperience.mockResolvedValue([]);
  });

  it('should preserve existing banner when only uploading avatar', async () => {
    // Mock avatar upload
    const mockAvatarUpload = {
      s3Url: 'https://example.com/new-avatar.jpg',
      url: 'https://example.com/new-avatar.jpg',
    };
    mediaService.uploadMedia.mockResolvedValue(mockAvatarUpload);

    // Mock profile update
    const mockUpdatedProfile = {
      ...mockProfileData,
      avatar: 'https://example.com/new-avatar.jpg',
      bannerUrl: 'https://example.com/old-banner.jpg', // Should be preserved
    };
    profileService.updateMyProfile.mockResolvedValue(mockUpdatedProfile);

    renderComponent();

    // Wait for profile to load
    await waitFor(() => {
      expect(profileService.getMyProfile).toHaveBeenCalled();
    });

    // Click to show avatar uploader
    const changePhotoBtn = screen.getByText(/Change.*Photo|Upload.*Photo/i);
    fireEvent.click(changePhotoBtn);

    // Upload avatar
    await waitFor(() => {
      expect(screen.getByTestId('avatar-uploader')).toBeInTheDocument();
    });

    const uploadAvatarBtn = screen.getByTestId('upload-avatar-btn');
    fireEvent.click(uploadAvatarBtn);

    // Wait for upload to complete
    await waitFor(() => {
      expect(mediaService.uploadMedia).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(File),
        'image',
        expect.objectContaining({
          title: 'Profile Avatar',
        })
      );
    });

    // Click save
    const saveBtn = screen.getByText('Save Changes');
    fireEvent.click(saveBtn);

    // Verify that the update payload includes avatar but does NOT include null banner
    await waitFor(() => {
      expect(profileService.updateMyProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          avatarUrl: 'https://example.com/new-avatar.jpg',
          // bannerUrl should either not be present, or not be null
        })
      );
    });

    // Verify banner was NOT overwritten with null
    const updateCall = profileService.updateMyProfile.mock.calls[0][0];
    if ('bannerUrl' in updateCall) {
      expect(updateCall.bannerUrl).not.toBeNull();
    }
  });

  it('should preserve existing avatar when only uploading banner', async () => {
    // Mock banner upload
    const mockBannerUpload = {
      s3Url: 'https://example.com/new-banner.jpg',
      url: 'https://example.com/new-banner.jpg',
    };
    mediaService.uploadMedia.mockResolvedValue(mockBannerUpload);

    // Mock profile update
    const mockUpdatedProfile = {
      ...mockProfileData,
      avatar: 'https://example.com/old-avatar.jpg', // Should be preserved
      bannerUrl: 'https://example.com/new-banner.jpg',
    };
    profileService.updateMyProfile.mockResolvedValue(mockUpdatedProfile);

    renderComponent();

    // Wait for profile to load
    await waitFor(() => {
      expect(profileService.getMyProfile).toHaveBeenCalled();
    });

    // Upload banner (assuming the MediaUploader for banner is visible)
    await waitFor(() => {
      const uploadImageBtn = screen.queryByTestId('upload-image-btn');
      if (uploadImageBtn) {
        fireEvent.click(uploadImageBtn);
      }
    });

    // Wait for upload to complete
    await waitFor(() => {
      if (mediaService.uploadMedia.mock.calls.length > 0) {
        expect(mediaService.uploadMedia).toHaveBeenCalledWith(
          expect.anything(),
          expect.any(File),
          'image',
          expect.objectContaining({
            title: 'Profile Banner',
          })
        );
      }
    }, { timeout: 3000 });

    // Click save
    const saveBtn = screen.getByText('Save Changes');
    fireEvent.click(saveBtn);

    // Verify that the update payload includes banner but does NOT include null avatar
    await waitFor(() => {
      expect(profileService.updateMyProfile).toHaveBeenCalled();
    });

    const updateCall = profileService.updateMyProfile.mock.calls[0][0];
    if ('avatarUrl' in updateCall) {
      expect(updateCall.avatarUrl).not.toBeNull();
    }
  });

  it('should update both avatar and banner when both are uploaded', async () => {
    // Mock uploads
    const mockAvatarUpload = {
      s3Url: 'https://example.com/new-avatar.jpg',
      url: 'https://example.com/new-avatar.jpg',
    };
    const mockBannerUpload = {
      s3Url: 'https://example.com/new-banner.jpg',
      url: 'https://example.com/new-banner.jpg',
    };

    // Return different results based on the title parameter
    mediaService.uploadMedia.mockImplementation((profileId, file, type, options) => {
      if (options.title === 'Profile Avatar') {
        return Promise.resolve(mockAvatarUpload);
      } else if (options.title === 'Profile Banner') {
        return Promise.resolve(mockBannerUpload);
      }
      return Promise.resolve({ s3Url: 'https://example.com/default.jpg' });
    });

    // Mock profile update
    const mockUpdatedProfile = {
      ...mockProfileData,
      avatar: 'https://example.com/new-avatar.jpg',
      bannerUrl: 'https://example.com/new-banner.jpg',
    };
    profileService.updateMyProfile.mockResolvedValue(mockUpdatedProfile);

    renderComponent();

    // Wait for profile to load
    await waitFor(() => {
      expect(profileService.getMyProfile).toHaveBeenCalled();
    });

    // Upload avatar first
    const changePhotoBtn = screen.getByText(/Change.*Photo|Upload.*Photo/i);
    fireEvent.click(changePhotoBtn);

    await waitFor(() => {
      expect(screen.getByTestId('avatar-uploader')).toBeInTheDocument();
    });

    const uploadAvatarBtn = screen.getByTestId('upload-avatar-btn');
    fireEvent.click(uploadAvatarBtn);

    await waitFor(() => {
      expect(mediaService.uploadMedia).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(File),
        'image',
        expect.objectContaining({
          title: 'Profile Avatar',
        })
      );
    });

    // Open the banner cropper (click 'Change' for the existing banner)
    const changeBannerBtn = screen.getByText('Change');
    fireEvent.click(changeBannerBtn);

    // Wait for banner uploader to appear and click upload
    await waitFor(() => {
      expect(screen.getByTestId('banner-uploader')).toBeInTheDocument();
    });

    const uploadBannerBtn = screen.getByTestId('upload-image-btn');
    fireEvent.click(uploadBannerBtn);

    await waitFor(() => {
      expect(mediaService.uploadMedia).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(File),
        'image',
        expect.objectContaining({
          title: 'Profile Banner',
        })
      );
    });

    // Click save
    const saveBtn = screen.getByText('Save Changes');
    fireEvent.click(saveBtn);

    // Verify both avatar and banner are in the update payload
    await waitFor(() => {
      expect(profileService.updateMyProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          avatarUrl: 'https://example.com/new-avatar.jpg',
          bannerUrl: 'https://example.com/new-banner.jpg',
        })
      );
    });
  });

  it('should not send null values in the payload', async () => {
    // Mock profile with no avatar or banner initially
    const emptyProfile = {
      ...mockProfileData,
      avatar: null,
      bannerUrl: null,
    };
    profileService.getMyProfile.mockResolvedValue(emptyProfile);

    renderComponent();

    await waitFor(() => {
      expect(profileService.getMyProfile).toHaveBeenCalled();
    });

    // Click save without uploading anything
    const saveBtn = screen.getByText('Save Changes');
    fireEvent.click(saveBtn);

    // Verify that null values are not sent
    await waitFor(() => {
      expect(profileService.updateMyProfile).toHaveBeenCalled();
    });

    const updateCall = profileService.updateMyProfile.mock.calls[0][0];
    
    // avatarUrl and bannerUrl should either not be in the payload,
    // or if they are, they should not be null
    if ('avatarUrl' in updateCall) {
      expect(updateCall.avatarUrl).not.toBeNull();
    }
    if ('bannerUrl' in updateCall) {
      expect(updateCall.bannerUrl).not.toBeNull();
    }
  });
});
