// src/pages/ProfileEdit.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, MapPin, Briefcase, GraduationCap, Award,
  Link as LinkIcon, Film, FileText, Plus, X, Save, ArrowLeft, Trash2, Edit2
} from 'lucide-react';
import ImageCropper from '../components/ImageCropper';
import CityAutocomplete from '../components/CityAutocomplete';
import MediaUploader from '../components/MediaUploader';
import SkillsTags from '../components/SkillsTags';
import ProfileLinksEditor from '../components/ProfileLinksEditor';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { getMyProfile, updateMyProfile, batchUpdateProfileLinks, listEducation, createEducation, updateEducation, deleteEducation, listExperience, createExperience, updateExperience, deleteExperience } from '../services/profileService';
import { uploadMedia } from '../services/mediaService';
import { sanitizeText } from '../utils/sanitize';
import { trackProfileUpdate, trackMediaUpload } from '../analytics/client';
import { getCacheBustedAvatarUrl, getCacheBustedBannerUrl } from '../utils/imageUtils';

// Helper function to convert old externalLinks format to new normalized format
const convertLegacyLinks = (externalLinks) => {
  if (!externalLinks || typeof externalLinks !== 'object') return [];

  // If it's already an array, assume it's the new format
  if (Array.isArray(externalLinks)) return externalLinks;

  // Convert old format to new
  const links = [];
  if (externalLinks.website) links.push({ label: 'Website', url: externalLinks.website, type: 'website' });
  if (externalLinks.imdb) links.push({ label: 'IMDb', url: externalLinks.imdb, type: 'imdb' });
  if (externalLinks.showreel) links.push({ label: 'Showreel', url: externalLinks.showreel, type: 'showreel' });
  if (externalLinks.instagram) links.push({ label: 'Instagram', url: externalLinks.instagram, type: 'other' });
  if (externalLinks.linkedin) links.push({ label: 'LinkedIn', url: externalLinks.linkedin, type: 'other' });

  return links;
};

// Error messages
const UPLOAD_ERROR_MESSAGES = {
  MISSING_S3_URL: 'Upload completed but server did not return S3 URL',
  NOT_LOGGED_IN: 'You must be logged in to upload media',
  UPLOAD_FAILED: 'Failed to upload',
};

// Helper function to map profile data to form data
const mapProfileToForm = (profileData) => {
  return {
    displayName: profileData.displayName || '',
    username: profileData.username || '',
    customRole: profileData.customRole || '',
    title: profileData.title || '',
    pronouns: profileData.pronouns || '',
    location: profileData.location || '',
    availabilityStatus: profileData.availabilityStatus || 'available',
    showPronouns: profileData.showPronouns !== undefined ? profileData.showPronouns : true,
    showLocation: profileData.showLocation !== undefined ? profileData.showLocation : true,
    showAvailability: profileData.showAvailability !== undefined ? profileData.showAvailability : true,
    primaryRoles: profileData.roles || [],
    bio: profileData.bio || '',
    languages: profileData.languages || [],
    avatar: profileData.avatar || null,
    // Note: Both banner and bannerUrl are maintained for compatibility
    // banner: Display URL used by UI components
    // bannerUrl: API field name expected by backend
    banner: profileData.bannerUrl || null,
    bannerUrl: profileData.bannerUrl || null,
    agency: profileData.agency || { name: '', contact: '' },
    contactPreferences: profileData.contactPreferences || {
      email: true,
      phone: false,
      platform: true
    },
    profileLinks: profileData.socialLinks || profileData.links || convertLegacyLinks(profileData.externalLinks) || [],
    primaryReel: profileData.primaryReel || null,
    reelPrivacy: profileData.reelPrivacy || 'public',
    credits: profileData.credits || [],
    experience: profileData.experience || [],
    education: profileData.education || [],
    skills: profileData.tags || []
  };
};

// Helper function to map form data to profile update payload
const mapFormToProfileUpdate = (formData) => {
  const payload = {
    displayName: formData.displayName,
    username: formData.username,
    title: formData.title,
    bio: formData.bio,
    location: formData.location,
    pronouns: formData.pronouns,
    availabilityStatus: formData.availabilityStatus,
    showPronouns: formData.showPronouns,
    showLocation: formData.showLocation,
    showAvailability: formData.showAvailability,
    roles: formData.primaryRoles,
    tags: formData.skills,
    links: formData.profileLinks  // Map to 'links' as expected by backend
  };

  // Only include avatar if it exists, is not null, and is not a blob: URL
  // Blob URLs are temporary browser-local URLs that cannot be persisted or fetched by the backend
  if (formData.avatar) {
    if (formData.avatar.startsWith('blob:')) {
      console.error('[mapFormToProfileUpdate] ERROR: Detected blob: URL for avatar - this should never happen if upload handlers are correct');
      toast.error('Avatar upload error: Please re-upload your avatar image');
      // Don't include avatarUrl in payload to avoid overwriting with invalid URL
    } else {
      payload.avatarUrl = formData.avatar;  // Map frontend 'avatar' to backend 'avatarUrl'
    }
  }

  // Only include banner if it exists, is not null, and is not a blob: URL
  const bannerValue = formData.banner || formData.bannerUrl;
  if (bannerValue) {
    if (bannerValue.startsWith('blob:')) {
      console.error('[mapFormToProfileUpdate] ERROR: Detected blob: URL for banner - this should never happen if upload handlers are correct');
      toast.error('Banner upload error: Please re-upload your banner image');
      // Don't include bannerUrl in payload to avoid overwriting with invalid URL
    } else {
      payload.bannerUrl = bannerValue;
    }
  }

  return payload;
};

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { user, updateUser, refreshUser } = useAuth();

  // Feature flag for backend integration
  const BACKEND_LINKS_ENABLED = import.meta.env.VITE_ENABLE_PROFILE_LINKS_API === 'true';

  // Loading state
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Profile state - stores the full profile object from backend
  const [profile, setProfile] = useState(null);

  // Profile ID state (needed for media uploads)
  const [profileId, setProfileId] = useState(null);

  // Form state - initialized from profile, not user context
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    customRole: '',
    title: '',
    pronouns: '',
    location: '',
    availabilityStatus: 'available',
    showPronouns: true,
    showLocation: true,
    showAvailability: true,
    primaryRoles: [],
    bio: '',
    languages: [],
    avatar: null,
    banner: null,
    bannerUrl: null,
    agency: { name: '', contact: '' },
    contactPreferences: {
      email: true,
      phone: false,
      platform: true
    },
    profileLinks: [],
    primaryReel: null,
    reelPrivacy: 'public',
    credits: [],
    experience: [],
    education: [],
    skills: []
  });

  // Track initial form data for analytics
  const [initialFormData, setInitialFormData] = useState(null);

  // Reset profile state when user changes (e.g., logout/login as different user)
  useEffect(() => {
    setProfile(null);
    setProfileId(null);
    setInitialFormData(null);
  }, [user?.id]);

  // Load profile from backend on mount (only once)
  useEffect(() => {
    const loadProfile = async () => {
      // Only load if we have a user and haven't loaded yet
      if (user?.id && !profile && !initialFormData) {
        setIsLoadingProfile(true);
        try {
          const profileData = await getMyProfile();
          if (profileData) {
            // Store the full profile object
            setProfile(profileData);

            // Store profile ID for media uploads
            setProfileId(profileData.id);

            // Initialize form data from profile using helper
            const mappedFormData = mapProfileToForm(profileData);
            setFormData(mappedFormData);

            // Set initial form data for analytics (only once)
            setInitialFormData(mappedFormData);
          }
        } catch (error) {
          console.error('Failed to load profile from backend:', error);
          // If profile fetch fails, form remains empty until retry
          toast.error('Failed to load profile data');
        } finally {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();
  }, [user?.id, profile, initialFormData]);

  // Education state
  const [educationList, setEducationList] = useState([]);
  const [isLoadingEducation, setIsLoadingEducation] = useState(false);
  const [editingEducation, setEditingEducation] = useState(null);
  const [showEducationForm, setShowEducationForm] = useState(false);

  // Experience state
  const [experienceList, setExperienceList] = useState([]);
  const [isLoadingExperience, setIsLoadingExperience] = useState(false);
  const [editingExperience, setEditingExperience] = useState(null);
  const [showExperienceForm, setShowExperienceForm] = useState(false);

  // Load education on mount
  useEffect(() => {
    const loadEducation = async () => {
      if (user?.id) {
        setIsLoadingEducation(true);
        try {
          const data = await listEducation();
          const normalizedEducation = Array.isArray(data) ? data : (data?.education || []);
          setEducationList(normalizedEducation);
        } catch (error) {
          console.error('Failed to load education:', error);
        } finally {
          setIsLoadingEducation(false);
        }
      }
    };
    loadEducation();
  }, [user?.id]);

  // Load experience on mount
  useEffect(() => {
    const loadExperience = async () => {
      if (user?.id) {
        setIsLoadingExperience(true);
        try {
          const data = await listExperience();
          const normalizedExperience = Array.isArray(data) ? data : (data?.experience || []);
          setExperienceList(normalizedExperience);
        } catch (error) {
          console.error('Failed to load experience:', error);
        } finally {
          setIsLoadingExperience(false);
        }
      }
    };
    loadExperience();
  }, [user?.id]);

  const [showAvatarUploader, setShowAvatarUploader] = useState(false);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [showBannerCropper, setShowBannerCropper] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingReel, setUploadingReel] = useState(false);

  // Skill suggestions for voice actors and theater professionals
  const skillSuggestions = [
    'Voice Acting', 'Stage Acting', 'Classical Theater', 'Contemporary',
    'Musical Theater', 'Improvisation', 'Dialects', 'Voice Over',
    'Character Voices', 'Narration', 'Audiobook', 'Commercial VO',
    'Animation', 'Video Games', 'Singing', 'Dance', 'Combat/Stunts',
    'Motion Capture', 'On-Camera', 'Directing', 'Playwriting'
  ];

  const roleOptions = [
    'Actor', 'Voice Actor', 'Playwright', 'Director',
    'Producer', 'Composer', 'Designer', 'Technician', 'Other'
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const handleArrayAdd = (field, item) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], item]
    }));
  };

  const handleArrayRemove = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const educationErrorMessage = (error, fallback) =>
    error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;

  // Education CRUD handlers
  const handleAddEducation = async (educationData) => {
    try {
      const result = await createEducation(educationData);
      const created = result?.education || result;
      setEducationList(prev => [...prev, created]);
      setShowEducationForm(false);
      toast.success('Education added!');
    } catch (error) {
      const message = educationErrorMessage(error, 'Failed to add education');
      toast.error(message);
    }
  };

  const handleUpdateEducation = async (id, updates) => {
    try {
      const result = await updateEducation(id, updates);
      const updated = result?.education || result;
      setEducationList(prev => prev.map(e => e.id === id ? updated : e));
      setEditingEducation(null);
      toast.success('Education updated!');
    } catch (error) {
      const message = educationErrorMessage(error, 'Failed to update education');
      toast.error(message);
    }
  };

  const handleDeleteEducation = async (id) => {
    try {
      await deleteEducation(id);
      setEducationList(prev => prev.filter(e => e.id !== id));
      toast.success('Education removed!');
    } catch (error) {
      toast.error('Failed to remove education');
    }
  };

  const extractErrorMessage = (error, fallback) =>
    error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;

  // Experience CRUD handlers
  const handleAddExperience = async (experienceData) => {
    try {
      const result = await createExperience(experienceData);
      const created = result?.experience || result;
      setExperienceList(prev => [...prev, created]);
      setShowExperienceForm(false);
      toast.success('Experience added!');
    } catch (error) {
      const message = extractErrorMessage(error, 'Failed to add experience');
      toast.error(message);
    }
  };

  const handleUpdateExperience = async (id, updates) => {
    try {
      const result = await updateExperience(id, updates);
      const updated = result?.experience || result;
      setExperienceList(prev => prev.map(e => e.id === id ? updated : e));
      setEditingExperience(null);
      toast.success('Experience updated!');
    } catch (error) {
      const message = extractErrorMessage(error, 'Failed to update experience');
      toast.error(message);
    }
  };

  const handleDeleteExperience = async (id) => {
    try {
      await deleteExperience(id);
      setExperienceList(prev => prev.filter(e => e.id !== id));
      toast.success('Experience removed!');
    } catch (error) {
      const message = extractErrorMessage(error, 'Failed to delete experience');
      toast.error(message);
    }
  };

  const handleAvatarUpload = async (croppedFile) => {
    // Avatar upload with cropped file from ImageCropper
    // The file is already processed (cropped, scaled) by ImageCropper

    setUploadingAvatar(true);
    const toastId = toast.loading('Uploading avatar...');

    try {
      // Use profile.id if available, otherwise let backend auto-create profile
      const targetProfileId = profileId || user?.id || 'me';
      const result = await uploadMedia(targetProfileId, croppedFile, 'image', {
        title: 'Profile Avatar',
        description: 'Profile picture',
        privacy: 'public',
        onProgress: (progress) => {
          // Optional: could show progress in toast or UI
          console.log(`Avatar upload progress: ${progress}%`);
        },
      });

      // CRITICAL: Use the S3 URL returned from backend, NOT a blob URL
      // Blob URLs only exist in the browser and cannot be fetched by CloudFront/API
      if (result?.s3Url) {
        handleChange('avatar', result.s3Url);
        await updateMyProfile({ avatarUrl: result.s3Url });
        await refreshUser();
      } else {
        throw new Error(UPLOAD_ERROR_MESSAGES.MISSING_S3_URL);
      }

      const sizeBucket = croppedFile.size < 1024 * 1024 ? 'small' : croppedFile.size < 5 * 1024 * 1024 ? 'medium' : 'large';
      trackMediaUpload('image', sizeBucket);

      toast.success('Profile picture saved!', { id: toastId });
      setShowAvatarUploader(false);
    } catch (error) {
      console.error('Avatar upload failed:', error);

      // Only show "not logged in" error if we actually got a 401/403 from the server
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        toast.error(UPLOAD_ERROR_MESSAGES.NOT_LOGGED_IN, { id: toastId });
      } else {
        toast.error(error.message || `${UPLOAD_ERROR_MESSAGES.UPLOAD_FAILED} avatar`, { id: toastId });
      }
      // Don't rethrow - just show error and let user retry
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (croppedFile) => {
    // Banner upload with cropped file from ImageCropper
    // The file is already processed (cropped, scaled) by ImageCropper

    setUploadingBanner(true);
    const toastId = toast.loading('Uploading banner...');

    try {
      // Use profile.id if available, otherwise let backend auto-create profile
      const targetProfileId = profileId || user?.id || 'me';
      const result = await uploadMedia(targetProfileId, croppedFile, 'image', {
        title: 'Profile Banner',
        description: 'Cover banner for profile',
        privacy: 'public',
        onProgress: (progress) => {
          // Optional: could show progress in toast or UI
          console.log(`Banner upload progress: ${progress}%`);
        },
      });

      // CRITICAL: Use the S3 URL returned from backend, NOT a blob URL
      // Blob URLs only exist in the browser and cannot be fetched by CloudFront/API
      if (result?.s3Url) {
        handleChange('banner', result.s3Url);
        handleChange('bannerUrl', result.s3Url);
        await updateMyProfile({ bannerUrl: result.s3Url });
        await refreshUser();
      } else {
        throw new Error(UPLOAD_ERROR_MESSAGES.MISSING_S3_URL);
      }

      const sizeBucket = croppedFile.size < 1024 * 1024 ? 'small' : croppedFile.size < 5 * 1024 * 1024 ? 'medium' : 'large';
      trackMediaUpload('image', sizeBucket);

      toast.success('Banner saved!', { id: toastId });
      setShowBannerCropper(false);
    } catch (error) {
      console.error('Banner upload failed:', error);

      // Only show "not logged in" error if we actually got a 401/403 from the server
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        toast.error(UPLOAD_ERROR_MESSAGES.NOT_LOGGED_IN, { id: toastId });
      } else {
        toast.error(error.message || `${UPLOAD_ERROR_MESSAGES.UPLOAD_FAILED} banner`, { id: toastId });
      }
      // Don't rethrow - just show error and let user retry
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleReelUpload = async (file, onProgress) => {
    // Don't check auth here - let the API call handle 401/403
    // This prevents flaky "not logged in" errors during auth state initialization

    setUploadingReel(true);
    const toastId = toast.loading('Uploading reel...');

    try {
      // Use profile.id if available, otherwise let backend auto-create profile
      const targetProfileId = profileId || user?.id || 'me';
      const result = await uploadMedia(targetProfileId, file, 'video', {
        title: formData.reelPrivacy === 'public' ? 'Demo Reel' : 'Private Reel',
        description: 'Primary demo reel',
        privacy: formData.reelPrivacy,
        onProgress,
      });

      // Update form data with the actual media URL from backend
      // Backend returns s3Url from completeUpload
      if (result?.s3Url || result?.url || result?.viewUrl) {
        const reelUrl = result.s3Url || result.url || result.viewUrl;
        handleChange('primaryReel', reelUrl);
      } else {
        // Fallback to temporary URL if backend doesn't return URL yet
        const tempUrl = URL.createObjectURL(file);
        handleChange('primaryReel', tempUrl);
      }

      // Track media upload
      const sizeBucket = file.size < 10 * 1024 * 1024 ? 'small' : file.size < 50 * 1024 * 1024 ? 'medium' : 'large';
      trackMediaUpload('video', sizeBucket);

      toast.success('Reel uploaded successfully!', { id: toastId });
    } catch (error) {
      console.error('Reel upload failed:', error);

      // Only show "not logged in" error if we actually got a 401/403 from the server
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        toast.error('You must be logged in to upload media', { id: toastId });
      } else {
        toast.error(error.message || 'Failed to upload reel', { id: toastId });
      }
      throw error;
    } finally {
      setUploadingReel(false);
    }
  };

  const handleSave = async () => {
    try {
      // Check if any uploads are in progress
      if (uploadingAvatar || uploadingBanner || uploadingReel) {
        toast.error('Please wait for uploads to complete before saving');
        return;
      }

      // Sanitize text fields before validation and submission
      const sanitizedData = {
        ...formData,
        displayName: sanitizeText(formData.displayName),
        title: sanitizeText(formData.title),
        bio: sanitizeText(formData.bio),
        location: sanitizeText(formData.location),
        pronouns: sanitizeText(formData.pronouns),
      };

      // Validate title length
      if (sanitizedData.title && sanitizedData.title.length > 100) {
        toast.error('Title must be 100 characters or less');
        return;
      }

      // Filter out empty links (where both label and URL are empty) before validation
      // This allows users to click "Add Link" but not fill it out without blocking save
      const nonEmptyLinks = sanitizedData.profileLinks.filter(link =>
        (link.label && link.label.trim() !== '') || (link.url && link.url.trim() !== '')
      );

      // Auto-add https:// to URLs that are missing a protocol
      const fixedLinks = nonEmptyLinks.map(link => {
        if (link.url && link.url.trim() !== '') {
          const url = link.url.trim();
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return { ...link, url: `https://${url}` };
          }
        }
        return link;
      });
      sanitizedData.profileLinks = fixedLinks;

      // Validate all remaining links before saving using the validation utility
      const { validateProfileLinks } = await import('../utils/urlValidation');
      const linksValidation = validateProfileLinks(sanitizedData.profileLinks);

      if (!linksValidation.valid) {
        if (linksValidation.globalErrors.length > 0) {
          toast.error(linksValidation.globalErrors[0]);
        } else {
          // Find the first link with errors and show a helpful message
          const errorIndex = Object.keys(linksValidation.errors)[0];
          const linkErrors = linksValidation.errors[errorIndex];
          const firstError = Object.values(linkErrors)[0];
          toast.error(`Link ${parseInt(errorIndex) + 1}: ${firstError}`);
        }
        return;
      }

      // Optimistic update - show loading toast
      const toastId = toast.loading('Saving profile changes...');

      // Save previous state for rollback
      const previousFormData = { ...formData };

      // Update form data with sanitized values
      setFormData(sanitizedData);

      // Optimistically update local user context
      updateUser(sanitizedData);

      try {
        // Backend API integration - call updateMyProfile when user is authenticated
        if (user?.id) {
          // Build profile update using helper function
          const profileUpdate = mapFormToProfileUpdate(sanitizedData);

          // Temporary diagnostic log to verify PATCH payload
          console.log('[ProfileEdit] PATCH /me/profile payload:', {
            avatarUrl: profileUpdate.avatarUrl,
            bannerUrl: profileUpdate.bannerUrl,
            displayName: profileUpdate.displayName,
            username: profileUpdate.username,
            title: profileUpdate.title,
            allFields: Object.keys(profileUpdate)
          });

          await updateMyProfile(profileUpdate);

          // Refresh user data from backend to ensure consistency
          await refreshUser();
        } else {
          // Fallback: simulate API delay for realistic UX
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Success feedback
        toast.success('Profile saved!', { id: toastId });

        // Track profile update with changed fields
        if (initialFormData) {
          const changedFields = [];
          Object.keys(sanitizedData).forEach(key => {
            if (JSON.stringify(sanitizedData[key]) !== JSON.stringify(initialFormData[key])) {
              changedFields.push(key);
            }
          });
          trackProfileUpdate(changedFields);
        }

        // Navigate back to profile after brief delay
        setTimeout(() => {
          navigate('/profile');
        }, 300);
      } catch (error) {
        // Rollback optimistic update on error
        updateUser(previousFormData);
        setFormData(previousFormData);

        console.error('Failed to update profile:', error);
        toast.error('Failed to save profile. Please try again.', { id: toastId });
      }

    } catch (error) {
      console.error('Unexpected error saving profile:', error);
      toast.error('Failed to save profile. Please try again.');
    }
  };

  return (
    <>
      {/* Modals */}
      {showAvatarUploader && (
        <ImageCropper
          onSave={handleAvatarUpload}
          onCancel={() => setShowAvatarUploader(false)}
          aspectRatio={1}
          title="Crop Avatar"
          targetSize={800}
        />
      )}
      {showBannerCropper && (
        <ImageCropper
          onSave={handleBannerUpload}
          onCancel={() => setShowBannerCropper(false)}
          aspectRatio={4}
          title="Crop Banner"
          targetSize={1600}
        />
      )}

      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 hover:bg-neutral-100 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-600" />
            </button>
            <span className="text-sm font-semibold text-neutral-900">Edit Profile</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-[200px,1fr] gap-10 items-start">

          {/* Sticky sidebar nav */}
          <aside className="sticky top-24">
            <nav className="border border-neutral-200 overflow-hidden">
              {[
                { id: 'section-images', label: 'Basic Info', icon: User },
                { id: 'section-credits', label: 'Credits', icon: Briefcase },
                { id: 'section-training', label: 'Education', icon: GraduationCap },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors border-b border-neutral-100 last:border-0"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
            <button
              onClick={handleSave}
              disabled={uploadingAvatar || uploadingBanner || uploadingReel}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{uploadingAvatar || uploadingBanner || uploadingReel ? 'Uploading…' : 'Save Changes'}</span>
            </button>
          </aside>

          {/* Scrollable content */}
          <div className="space-y-14">

        {/* Profile Images */}
        <div id="section-images" className="scroll-mt-24">
          <SectionHeading title="Profile Images" />
          <div className="relative mb-16">
            <div className="relative h-52 bg-neutral-100 border border-neutral-200 overflow-hidden">
              {formData.banner ? (
                <img src={formData.banner} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <button
                  onClick={() => setShowBannerCropper(true)}
                  disabled={uploadingBanner}
                  className="w-full h-full flex flex-col items-center justify-center hover:bg-neutral-200 transition-colors"
                >
                  <Plus className="w-6 h-6 text-neutral-400 mb-1" />
                  <span className="text-xs text-neutral-400">Upload banner · 1600 × 400</span>
                </button>
              )}
              {formData.banner && (
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={() => setShowBannerCropper(true)}
                    disabled={uploadingBanner}
                    className="px-2.5 py-1 bg-black/60 hover:bg-black/80 text-white text-xs font-medium transition-colors"
                  >
                    Change
                  </button>
                  <button
                    onClick={() => { handleChange('banner', null); handleChange('bannerUrl', null); }}
                    disabled={uploadingBanner}
                    className="p-1 bg-black/60 hover:bg-black/80 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              )}
            </div>
            <div className="absolute -bottom-12 left-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full ring-4 ring-white overflow-hidden shadow">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                      <span className="text-white text-xl font-semibold">
                        {(formData.displayName || user?.displayName || 'U')[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowAvatarOptions(v => !v)}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <span className="text-white text-[10px] font-semibold">{uploadingAvatar ? '…' : 'Edit'}</span>
                </button>
              </div>
            </div>
          </div>
          {showAvatarOptions && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => { setShowAvatarUploader(true); setShowAvatarOptions(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white text-xs font-semibold transition-all"
              >
                Choose Image
              </button>
              {formData.avatar && (
                <button
                  onClick={() => { handleChange('avatar', null); setShowAvatarOptions(false); }}
                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          )}
        </div>

        {/* Identity */}
        <div id="section-identity" className="scroll-mt-24">
          <SectionHeading title="Identity" />
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-1.5">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleChange('displayName', e.target.value)}
                  className="w-full bg-white border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0CCE6B] transition-colors"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-1.5">
                  Username <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center bg-white border border-neutral-200 px-3 focus-within:border-[#0CCE6B] transition-colors">
                  <span className="text-neutral-400 text-sm pr-1">@</span>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    className="flex-1 bg-transparent border-0 px-0 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none"
                    placeholder="username"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-1.5">
                Professional Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full bg-white border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0CCE6B] transition-colors"
                placeholder="e.g. Senior Voice Actor · Audio Drama"
                maxLength={100}
              />
              <p className="mt-1 text-xs text-neutral-400">{formData.title.length}/100</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-1.5">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                rows={5}
                maxLength={600}
                className="w-full bg-white border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0CCE6B] transition-colors resize-none"
                placeholder="Tell the industry who you are…"
              />
              <p className="mt-1 text-xs text-neutral-400">{formData.bio.length}/600</p>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-1.5">Pronouns</label>
                <input
                  type="text"
                  value={formData.pronouns}
                  onChange={(e) => handleChange('pronouns', e.target.value)}
                  className="w-full bg-white border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0CCE6B] transition-colors"
                  placeholder="they/them"
                />
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={formData.showPronouns} onChange={(e) => handleChange('showPronouns', e.target.checked)} className="w-4 h-4 accent-[#0CCE6B]" />
                  <span className="text-xs text-neutral-500">Show on profile</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-1.5">Location</label>
                <CityAutocomplete
                  value={formData.location}
                  onChange={(val) => handleChange('location', val)}
                  placeholder="City…"
                />
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={formData.showLocation} onChange={(e) => handleChange('showLocation', e.target.checked)} className="w-4 h-4 accent-[#0CCE6B]" />
                  <span className="text-xs text-neutral-500">Show on profile</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-1.5">Availability</label>
              <select
                value={formData.availabilityStatus}
                onChange={(e) => handleChange('availabilityStatus', e.target.value)}
                className="w-full bg-white border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-[#0CCE6B] transition-colors"
              >
                <option value="available">Available</option>
                <option value="not-available">Not Available</option>
                <option value="booking">Accepting Bookings</option>
              </select>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={formData.showAvailability} onChange={(e) => handleChange('showAvailability', e.target.checked)} className="w-4 h-4 accent-[#0CCE6B]" />
                <span className="text-xs text-neutral-500">Show on profile</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-3">Primary Roles</label>
              {(() => {
                const hasOtherRole = formData.primaryRoles.some(r => r.startsWith('Other:')) || formData.customRole;
                return (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {roleOptions.map(role => {
                        const isSelected = role === 'Other' ? hasOtherRole : formData.primaryRoles.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              if (role === 'Other') {
                                if (hasOtherRole) {
                                  handleChange('customRole', '');
                                  handleChange('primaryRoles', formData.primaryRoles.filter(r => !r.startsWith('Other:')));
                                } else {
                                  handleChange('primaryRoles', [...formData.primaryRoles, 'Other:']);
                                }
                              } else if (isSelected) {
                                handleChange('primaryRoles', formData.primaryRoles.filter(r => r !== role));
                              } else {
                                handleChange('primaryRoles', [...formData.primaryRoles, role]);
                              }
                            }}
                            className={`px-3 py-1.5 text-sm font-medium border transition-colors ${
                              isSelected
                                ? 'bg-neutral-900 border-neutral-900 text-white'
                                : 'border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'
                            }`}
                          >
                            {role}
                          </button>
                        );
                      })}
                    </div>
                    {hasOtherRole && (
                      <input
                        type="text"
                        value={formData.customRole || ''}
                        onChange={(e) => {
                          const customValue = e.target.value;
                          handleChange('customRole', customValue);
                          const otherRoles = formData.primaryRoles.filter(r => !r.startsWith('Other:'));
                          if (customValue.trim()) {
                            handleChange('primaryRoles', [...otherRoles, `Other: ${customValue.trim()}`]);
                          } else {
                            handleChange('primaryRoles', otherRoles);
                          }
                        }}
                        placeholder="Describe your role…"
                        className="mt-3 w-full bg-white border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0CCE6B] transition-colors"
                      />
                    )}
                  </>
                );
              })()}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-2">Skills & Specializations</label>
              <SkillsTags
                skills={formData.skills}
                onChange={(skills) => handleChange('skills', skills)}
                suggestions={skillSuggestions}
              />
            </div>
          </div>
        </div>

        {/* Links & Representation */}
        <div id="section-links" className="scroll-mt-24">
          <SectionHeading title="Links & Representation" />
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-3">External Links</label>
              <ProfileLinksEditor
                links={formData.profileLinks}
                onChange={(links) => handleChange('profileLinks', links)}
                maxLinks={20}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-4">Representative Agency</label>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Agency name</label>
                  <input
                    type="text"
                    value={formData.agency.name}
                    onChange={(e) => handleNestedChange('agency', 'name', e.target.value)}
                    className="w-full bg-white border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0CCE6B] transition-colors"
                    placeholder="e.g. Creative Artists Agency"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Contact / email</label>
                  <input
                    type="text"
                    value={formData.agency.contact}
                    onChange={(e) => handleNestedChange('agency', 'contact', e.target.value)}
                    className="w-full bg-white border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0CCE6B] transition-colors"
                    placeholder="agent@example.com"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Credits */}
        <div id="section-credits" className="scroll-mt-24">
          <SectionHeading title="Credits" />
          {isLoadingExperience ? (
            <p className="text-sm text-neutral-400">Loading credits…</p>
          ) : (
            <div className="space-y-4">
              {experienceList.length === 0 && !showExperienceForm && (
                <p className="text-sm text-neutral-400 mb-2">
                  Add your professional credits — productions, films, audio dramas, theater work.
                </p>
              )}
              {experienceList.map((exp) => (
                <div key={exp.id} className="border-b border-neutral-100 pb-5 last:border-0">
                  {editingExperience === exp.id ? (
                    <ExperienceForm
                      initialData={exp}
                      onSave={(data) => handleUpdateExperience(exp.id, data)}
                      onCancel={() => setEditingExperience(null)}
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900">{exp.title}</p>
                        <p className="text-sm text-neutral-500 mt-0.5">
                          {exp.role}{exp.company ? ` · ${exp.company}` : ''}{exp.year ? ` · ${exp.year}` : ''}
                        </p>
                        {exp.description && (
                          <p className="text-sm text-neutral-400 mt-1">{exp.description}</p>
                        )}
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <button onClick={() => setEditingExperience(exp.id)} className="p-1.5 hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-700" aria-label="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteExperience(exp.id)} className="p-1.5 hover:bg-red-50 transition-colors text-neutral-400 hover:text-red-600" aria-label="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {showExperienceForm ? (
                <div className="border border-neutral-200 bg-white p-5">
                  <ExperienceForm
                    onSave={handleAddExperience}
                    onCancel={() => setShowExperienceForm(false)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowExperienceForm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white text-sm font-semibold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Credit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Education */}
        <div id="section-training" className="scroll-mt-24">
          <SectionHeading title="Education" />
          {isLoadingEducation ? (
            <p className="text-sm text-neutral-400">Loading training…</p>
          ) : (
            <div className="space-y-4">
              {educationList.map((edu) => (
                <div key={edu.id} className="border-b border-neutral-100 pb-5 last:border-0">
                  {editingEducation === edu.id ? (
                    <EducationForm
                      initialData={edu}
                      onSave={(data) => handleUpdateEducation(edu.id, data)}
                      onCancel={() => setEditingEducation(null)}
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900">{edu.institution}</p>
                        <p className="text-sm text-neutral-500 mt-0.5">
                          {edu.program}{(edu.startYear || edu.endYear) ? ` · ${edu.startYear || '?'}–${edu.endYear || 'Present'}` : ''}
                        </p>
                        {edu.achievements && (
                          <p className="text-sm text-neutral-400 mt-1">{edu.achievements}</p>
                        )}
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <button onClick={() => setEditingEducation(edu.id)} className="p-1.5 hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-700" aria-label="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteEducation(edu.id)} className="p-1.5 hover:bg-red-50 transition-colors text-neutral-400 hover:text-red-600" aria-label="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {showEducationForm ? (
                <div className="border border-neutral-200 bg-white p-5">
                  <EducationForm
                    onSave={handleAddEducation}
                    onCancel={() => setShowEducationForm(false)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowEducationForm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white text-sm font-semibold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Education
                </button>
              )}
            </div>
          )}
        </div>

        {/* Media — feature-flagged */}
        {import.meta.env.VITE_ENABLE_PROFILE_MEDIA === 'true' && (
          <div id="section-media" className="scroll-mt-24">
            <SectionHeading title="Media & Portfolio" />
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-3">Primary Reel</label>
                {formData.primaryReel ? (
                  <div className="space-y-3">
                    <div className="aspect-video bg-neutral-100 border border-neutral-200 overflow-hidden">
                      <video src={formData.primaryReel} controls className="w-full h-full" />
                    </div>
                    <button onClick={() => handleChange('primaryReel', null)} disabled={uploadingReel} className="text-xs text-red-500 hover:text-red-700 transition-colors">
                      Remove Reel
                    </button>
                  </div>
                ) : (
                  <MediaUploader onUpload={handleReelUpload} acceptedTypes="video/*" uploadType="video" maxSize={500} showPreview={false} />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">Reel Privacy</label>
                <select
                  value={formData.reelPrivacy}
                  onChange={(e) => handleChange('reelPrivacy', e.target.value)}
                  disabled={uploadingReel}
                  className="w-full bg-white border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-[#0CCE6B] transition-colors"
                >
                  <option value="public">Public — Anyone can watch</option>
                  <option value="on-request">On Request — Requires approval</option>
                  <option value="private">Private — Only you</option>
                </select>
              </div>
            </div>
          </div>
        )}

          </div>{/* end scrollable content */}
        </div>{/* end grid */}
      </div>
    </>
  );
}

function SectionHeading({ title }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <h2 className="text-base font-semibold text-neutral-900 shrink-0">{title}</h2>
      <div className="flex-1 h-px bg-neutral-200" />
    </div>
  );
}

function ExperienceForm({ initialData = {}, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    role: initialData.role || '',
    company: initialData.company || '',
    year: initialData.year || '',
    description: initialData.description || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.role.trim()) {
      toast.error('Title and Role are required');
      return;
    }
    const year = formData.year ? parseInt(formData.year, 10) : null;
    if (year && (year < 1900 || year > new Date().getFullYear() + 5)) {
      toast.error(`Year must be between 1900 and ${new Date().getFullYear() + 5}`);
      return;
    }
    onSave({
      title: formData.title.trim(),
      role: formData.role.trim(),
      company: formData.company.trim() || null,
      year,
      description: formData.description.trim() || null
    });
  };

  const inputCls = "w-full bg-white border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-300 focus:outline-none focus:border-[#0CCE6B] transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-1.5">
            Production / Project <span className="text-red-400">*</span>
          </label>
          <input type="text" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} className={inputCls} placeholder="e.g. The Magnus Archives" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-1.5">
            Role <span className="text-red-400">*</span>
          </label>
          <input type="text" value={formData.role} onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))} className={inputCls} placeholder="e.g. Lead Actor" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-1.5">Company</label>
          <input type="text" value={formData.company} onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))} className={inputCls} placeholder="e.g. Rusty Quill" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-1.5">Year</label>
          <input type="number" value={formData.year} onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))} className={inputCls} placeholder="2023" min="1900" max={new Date().getFullYear() + 5} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-900 mb-1.5">Description</label>
        <textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} className={`${inputCls} resize-none`} rows={2} placeholder="Brief description of your role…" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
          Cancel
        </button>
        <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white text-sm font-semibold transition-all">
          <Save className="w-3.5 h-3.5" />
          Save Credit
        </button>
      </div>
    </form>
  );
}

function EducationForm({ initialData = {}, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    institution: initialData.institution || '',
    program: initialData.program || '',
    startYear: initialData.startYear || '',
    endYear: initialData.endYear || '',
    achievements: initialData.achievements || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.institution.trim() || !formData.program.trim()) return;
    const startYear = formData.startYear ? parseInt(formData.startYear, 10) : null;
    const endYear = formData.endYear ? parseInt(formData.endYear, 10) : null;
    if (startYear && (startYear < 1900 || startYear > 2035)) { toast.error('Start year must be between 1900 and 2035'); return; }
    if (endYear && (endYear < 1900 || endYear > 2035)) { toast.error('End year must be between 1900 and 2035'); return; }
    if (startYear && endYear && endYear < startYear) { toast.error('End year must be after start year'); return; }
    onSave({
      institution: formData.institution.trim(),
      program: formData.program.trim(),
      startYear,
      endYear,
      achievements: formData.achievements.trim() || null
    });
  };

  const inputCls = "w-full bg-white border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-300 focus:outline-none focus:border-[#0CCE6B] transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-1.5">
            Institution <span className="text-red-400">*</span>
          </label>
          <input type="text" value={formData.institution} onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))} className={inputCls} placeholder="e.g. Juilliard School" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-1.5">
            Program <span className="text-red-400">*</span>
          </label>
          <input type="text" value={formData.program} onChange={(e) => setFormData(prev => ({ ...prev, program: e.target.value }))} className={inputCls} placeholder="e.g. BFA in Drama" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-1.5">Start Year</label>
          <input type="number" value={formData.startYear} onChange={(e) => setFormData(prev => ({ ...prev, startYear: e.target.value }))} className={inputCls} placeholder="2018" min="1900" max="2035" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-1.5">End Year</label>
          <input type="number" value={formData.endYear} onChange={(e) => setFormData(prev => ({ ...prev, endYear: e.target.value }))} className={inputCls} placeholder="2022 (blank = present)" min="1900" max="2035" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-900 mb-1.5">Achievements / Notes</label>
        <textarea value={formData.achievements} onChange={(e) => setFormData(prev => ({ ...prev, achievements: e.target.value }))} className={`${inputCls} resize-none`} rows={2} placeholder="e.g. Dean's List, Lead in senior production" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
          Cancel
        </button>
        <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white text-sm font-semibold transition-all">
          <Save className="w-3.5 h-3.5" />
          {initialData.id ? 'Update' : 'Add'} Education
        </button>
      </div>
    </form>
  );
}
