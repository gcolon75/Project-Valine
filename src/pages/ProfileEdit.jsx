// src/pages/ProfileEdit.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, MapPin, Briefcase, GraduationCap, Award, 
  Link as LinkIcon, Film, FileText, Plus, X, Save, ArrowLeft, Trash2, Edit2
} from 'lucide-react';
import ImageCropper from '../components/ImageCropper';
import MediaUploader from '../components/MediaUploader';
import SkillsTags from '../components/SkillsTags';
import ProfileLinksEditor from '../components/ProfileLinksEditor';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { getMyProfile, updateMyProfile, batchUpdateProfileLinks, listEducation, createEducation, updateEducation, deleteEducation, listExperience, createExperience, updateExperience, deleteExperience } from '../services/profileService';
import { uploadMedia } from '../services/mediaService';
import { sanitizeText } from '../utils/sanitize';
import { trackProfileUpdate, trackMediaUpload } from '../analytics/client';

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { user, updateUser, refreshUser } = useAuth();
  
  // Feature flag for backend integration
  const BACKEND_LINKS_ENABLED = import.meta.env.VITE_ENABLE_PROFILE_LINKS_API === 'true';
  
  // Loading state
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  
  // Profile ID state (needed for media uploads)
  const [profileId, setProfileId] = useState(null);
  
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
  
  // Form state
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    username: user?.username || '',
    customRole: user?.customRole || '',
    title: user?.title || '',
    pronouns: user?.pronouns || '',
    location: user?.location || '',
    availabilityStatus: user?.availabilityStatus || 'available',
    primaryRoles: user?.primaryRoles || [],
    bio: user?.bio || '',
    languages: user?.languages || [],
    avatar: user?.avatar || null,
    banner: user?.banner || null,
    bannerUrl: user?.bannerUrl || null,
    agency: user?.agency || { name: '', contact: '' },
    contactPreferences: user?.contactPreferences || {
      email: true,
      phone: false,
      platform: true
    },
    // Support both old and new link formats
    profileLinks: convertLegacyLinks(user?.externalLinks || user?.profileLinks),
    primaryReel: user?.primaryReel || null,
    reelPrivacy: user?.reelPrivacy || 'public',
    credits: user?.credits || [],
    experience: user?.experience || [],
    education: user?.education || [],
    skills: user?.skills || []
  });
  
  // Track initial form data for analytics
  const [initialFormData, setInitialFormData] = useState(null);
  
  // Set initial data once on mount
  useEffect(() => {
    if (!initialFormData) {
      setInitialFormData({...formData});
    }
  }, []);

  // Load profile from backend on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (user?.id) {
        setIsLoadingProfile(true);
        try {
          const profileData = await getMyProfile();
          // Update form data with backend profile data
          if (profileData) {
            // Store profile ID for media uploads
            setProfileId(profileData.id);
            
            setFormData(prev => ({
              ...prev,
              displayName: profileData.displayName || prev.displayName,
              username: profileData.username || prev.username,
              title: profileData.title || prev.title,
              bio: profileData.bio || prev.bio,
              location: profileData.location || prev.location,
              pronouns: profileData.pronouns || prev.pronouns,
              avatar: profileData.avatar || prev.avatar,
              banner: profileData.bannerUrl || prev.banner,
              bannerUrl: profileData.bannerUrl || prev.bannerUrl,
              primaryRoles: profileData.roles || prev.primaryRoles,
              skills: profileData.tags || prev.skills,
              profileLinks: profileData.socialLinks || profileData.links || prev.profileLinks,
              education: profileData.education || prev.education,
            }));
          }
        } catch (error) {
          console.error('Failed to load profile from backend:', error);
          // Continue with existing data from user context
        } finally {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();
  }, [user?.id]);

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

  const [showImageCropper, setShowImageCropper] = useState(false);
  const [cropperType, setCropperType] = useState(null); // 'avatar' or 'banner'
  const [activeSection, setActiveSection] = useState('basic');
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

  const handleAvatarUpload = (imageUrl) => {
    handleChange('avatar', imageUrl);
    setShowImageCropper(false);
  };

  const handleBannerUpload = async (file, onProgress) => {
    // Don't check auth here - let the API call handle 401/403
    // This prevents flaky "not logged in" errors during auth state initialization
    
    setUploadingBanner(true);
    const toastId = toast.loading('Uploading banner...');

    try {
      // Use profile.id if available, otherwise let backend auto-create profile
      const targetProfileId = profileId || user?.id || 'me';
      const result = await uploadMedia(targetProfileId, file, 'image', {
        title: 'Profile Banner',
        description: 'Cover banner for profile',
        privacy: 'public',
        onProgress,
      });

      // Update form data with the actual media URL from backend
      if (result?.url || result?.viewUrl) {
        const bannerUrl = result.url || result.viewUrl;
        handleChange('banner', bannerUrl);
        handleChange('bannerUrl', bannerUrl);
      } else {
        // Fallback to temporary URL if backend doesn't return URL yet
        const tempUrl = URL.createObjectURL(file);
        handleChange('banner', tempUrl);
      }

      // Track media upload
      const sizeBucket = file.size < 1024 * 1024 ? 'small' : file.size < 5 * 1024 * 1024 ? 'medium' : 'large';
      trackMediaUpload('image', sizeBucket);

      toast.success('Banner uploaded successfully!', { id: toastId });
    } catch (error) {
      console.error('Banner upload failed:', error);
      
      // Only show "not logged in" error if we actually got a 401/403 from the server
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        toast.error('You must be logged in to upload media', { id: toastId });
      } else {
        toast.error(error.message || 'Failed to upload banner', { id: toastId });
      }
      throw error;
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
      if (result?.url || result?.viewUrl) {
        const reelUrl = result.url || result.viewUrl;
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

      // Validate all links before saving using the validation utility
      const { validateProfileLinks } = await import('../utils/urlValidation');
      const linksValidation = validateProfileLinks(sanitizedData.profileLinks);

      if (!linksValidation.valid) {
        if (linksValidation.globalErrors.length > 0) {
          toast.error(linksValidation.globalErrors[0]);
        } else {
          toast.error('Please fix validation errors in profile links before saving');
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
          // Build profile update with all editable fields matching backend API
          const profileUpdate = {
            displayName: sanitizedData.displayName,
            username: sanitizedData.username,
            title: sanitizedData.title,
            bio: sanitizedData.bio,
            location: sanitizedData.location,
            pronouns: sanitizedData.pronouns,
            roles: sanitizedData.primaryRoles,
            tags: sanitizedData.skills,
            avatar: sanitizedData.avatar,
            bannerUrl: sanitizedData.banner || sanitizedData.bannerUrl,
            socialLinks: sanitizedData.profileLinks
          };
          
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

  // Sections configuration - Media section available only when feature flag is enabled
  // Set VITE_ENABLE_PROFILE_MEDIA=true in .env to show Media section
  const sections = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'education', label: 'Education', icon: GraduationCap }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
          </button>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            Edit Profile
          </h1>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white rounded-lg font-semibold transition-all"
        >
          <Save className="w-5 h-5" />
          <span>Save Changes</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 sticky top-6">
            <nav className="space-y-1">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-gradient-to-r from-[#474747]/10 to-[#0CCE6B]/10 text-[#0CCE6B]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Form Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Basic Info Section */}
          {activeSection === 'basic' && (
            <>
              {/* Profile Images */}
              <FormSection title="Profile Images" icon={User}>
                <div className="space-y-4">
                  {/* Banner */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Cover Banner (1600x400 recommended)
                    </label>
                    {formData.banner ? (
                      <div className="relative aspect-[4/1] rounded-lg overflow-hidden">
                        <img src={formData.banner} alt="Banner" className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleChange('banner', null)}
                          className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
                          disabled={uploadingBanner}
                        >
                          <X className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    ) : (
                      <MediaUploader
                        onUpload={handleBannerUpload}
                        acceptedTypes="image/*"
                        uploadType="image"
                        maxSize={10}
                      />
                    )}
                  </div>

                  {/* Avatar */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Profile Picture (800x800 recommended)
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="w-24 h-24 rounded-full border-2 border-neutral-200 dark:border-neutral-700 overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                        {formData.avatar ? (
                          <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-12 h-12 text-neutral-400" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            setCropperType('avatar');
                            setShowImageCropper(true);
                          }}
                          className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          {formData.avatar ? 'Change' : 'Upload'} Photo
                        </button>
                        {formData.avatar && (
                          <button
                            onClick={() => handleChange('avatar', null)}
                            className="block text-sm text-red-600 dark:text-red-400 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </FormSection>

              {/* Basic Information */}
              <FormSection title="Basic Information" icon={User}>
                <div className="space-y-4">
                  <FormField label="Name" required>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => handleChange('displayName', e.target.value)}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your full name"
                    />
                  </FormField>

                  <FormField label="Username" required>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 border border-r-0 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-l-lg">
                        @
                      </span>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => handleChange('username', e.target.value)}
                        className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-r-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="username"
                      />
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-600 mt-1">
                      Used for tagging and your profile URL
                    </p>
                  </FormField>

                  <FormField label="Professional Title">
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Senior Voice Actor"
                      maxLength={100}
                    />
                    <p className="text-xs text-neutral-500 dark:text-neutral-600 mt-1">
                      {formData.title.length}/100 characters
                    </p>
                  </FormField>

                  <FormField label="Pronouns">
                    <input
                      type="text"
                      value={formData.pronouns}
                      onChange={(e) => handleChange('pronouns', e.target.value)}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="they/them"
                    />
                  </FormField>

                  <FormField label="Location">
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Seattle, WA, USA"
                    />
                  </FormField>

                  <FormField label="Availability Status">
                    <select
                      value={formData.availabilityStatus}
                      onChange={(e) => handleChange('availabilityStatus', e.target.value)}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="available">Available</option>
                      <option value="not-available">Not Available</option>
                      <option value="booking">Accepting Bookings</option>
                    </select>
                  </FormField>

                  <FormField label="Primary Roles">
                    <div className="space-y-2">
                      {(() => {
                        const hasOtherRole = formData.primaryRoles.some(r => r.startsWith('Other:')) || formData.customRole;
                        return (
                          <>
                            {roleOptions.map(role => (
                              <label key={role} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={role === 'Other' ? hasOtherRole : formData.primaryRoles.includes(role)}
                                  onChange={(e) => {
                                    if (role === 'Other') {
                                      if (!e.target.checked) {
                                        // Clearing Other - remove custom role
                                        handleChange('customRole', '');
                                        handleChange('primaryRoles', formData.primaryRoles.filter(r => !r.startsWith('Other:')));
                                      }
                                    } else if (e.target.checked) {
                                      handleChange('primaryRoles', [...formData.primaryRoles, role]);
                                    } else {
                                      handleChange('primaryRoles', formData.primaryRoles.filter(r => r !== role));
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700"
                                />
                                <span className="text-neutral-900 dark:text-white">{role}</span>
                              </label>
                            ))}
                            {/* Custom role text input when Other is checked */}
                            {hasOtherRole && (
                              <div className="ml-6 mt-2">
                                <input
                                  type="text"
                                  value={formData.customRole || ''}
                                  onChange={(e) => {
                                    const customValue = e.target.value;
                                    handleChange('customRole', customValue);
                                    // Update primaryRoles to include custom role
                                    const otherRoles = formData.primaryRoles.filter(r => !r.startsWith('Other:'));
                                    if (customValue.trim()) {
                                      handleChange('primaryRoles', [...otherRoles, `Other: ${customValue.trim()}`]);
                                    } else {
                                      handleChange('primaryRoles', otherRoles);
                                    }
                                  }}
                                  placeholder="Specify your role..."
                                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </FormField>

                  <FormField label="Bio">
                    <textarea
                      value={formData.bio}
                      onChange={(e) => handleChange('bio', e.target.value)}
                      rows={6}
                      maxLength={600}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                      placeholder="Tell us about yourself..."
                    />
                    <p className="text-xs text-neutral-500 dark:text-neutral-600 mt-1">
                      {formData.bio.length}/600 characters
                    </p>
                  </FormField>

                  <FormField label="Skills & Specializations">
                    <SkillsTags
                      skills={formData.skills}
                      onChange={(skills) => handleChange('skills', skills)}
                      suggestions={skillSuggestions}
                    />
                  </FormField>
                </div>
              </FormSection>

              {/* Contact & Links */}
              <FormSection title="Contact & Links" icon={LinkIcon}>
                <div className="space-y-4">
                  <FormField label="External Links">
                    <ProfileLinksEditor
                      links={formData.profileLinks}
                      onChange={(links) => handleChange('profileLinks', links)}
                      maxLinks={20}
                    />
                  </FormField>

                  <FormField label="Representative Agency">
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={formData.agency.name}
                        onChange={(e) => handleNestedChange('agency', 'name', e.target.value)}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Agency Name"
                      />
                      <input
                        type="text"
                        value={formData.agency.contact}
                        onChange={(e) => handleNestedChange('agency', 'contact', e.target.value)}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Agency Contact"
                      />
                    </div>
                  </FormField>
                </div>
              </FormSection>
            </>
          )}

          {/* Media Section - Feature flagged for future release */}
          {import.meta.env.VITE_ENABLE_PROFILE_MEDIA === 'true' && activeSection === 'media' && (
            <FormSection title="Media & Portfolio" icon={Film}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Primary Reel
                  </label>
                  {formData.primaryReel ? (
                    <div className="space-y-3">
                      <div className="aspect-video rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                        <video 
                          src={formData.primaryReel} 
                          controls 
                          className="w-full h-full"
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                      <button
                        onClick={() => handleChange('primaryReel', null)}
                        className="text-sm text-red-600 dark:text-red-400 hover:underline"
                        disabled={uploadingReel}
                      >
                        Remove Reel
                      </button>
                    </div>
                  ) : (
                    <MediaUploader
                      onUpload={handleReelUpload}
                      acceptedTypes="video/*"
                      uploadType="video"
                      maxSize={500}
                      showPreview={false}
                    />
                  )}
                </div>

                <FormField label="Reel Privacy">
                  <select
                    value={formData.reelPrivacy}
                    onChange={(e) => handleChange('reelPrivacy', e.target.value)}
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={uploadingReel}
                  >
                    <option value="public">Public - Anyone can watch</option>
                    <option value="on-request">On Request - Requires approval</option>
                    <option value="private">Private - Only you</option>
                  </select>
                </FormField>
              </div>
            </FormSection>
          )}

          {/* Experience Section */}
          {activeSection === 'experience' && (
            <FormSection title="Experience & Credits" icon={Briefcase}>
              <div className="space-y-4">
                {isLoadingExperience ? (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading experience...</p>
                ) : (
                  <>
                    {/* Existing Experience Entries */}
                    {experienceList.length > 0 && (
                      <div className="space-y-4">
                        {experienceList.map((exp) => (
                          <div 
                            key={exp.id} 
                            className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-neutral-900 dark:text-white">{exp.title}</h4>
                                <p className="text-neutral-600 dark:text-neutral-400">{exp.company}</p>
                                {(exp.startDate || exp.endDate) && (
                                  <p className="text-sm text-neutral-500">
                                    {exp.startDate || '?'} - {exp.endDate || 'Present'}
                                  </p>
                                )}
                                {exp.description && (
                                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{exp.description}</p>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleDeleteExperience(exp.id)}
                                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  aria-label="Delete experience"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Add your professional experience, productions, and credits
                    </p>
                    
                    {/* Note: Full experience form similar to EducationForm will be added in future update */}
                    <button 
                      onClick={() => {
                        // Stub implementation - will call handleAddExperience when form is built
                        toast.info('Experience form coming soon! Full CRUD handlers are ready.');
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-lg transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Add Experience</span>
                    </button>
                  </>
                )}
              </div>
            </FormSection>
          )}

          {/* Education Section */}
          {activeSection === 'education' && (
            <FormSection title="Education & Training" icon={GraduationCap}>
              <div className="space-y-4">
                {isLoadingEducation ? (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading education...</p>
                ) : (
                  <>
                    {/* Existing Education Entries */}
                    {educationList.length > 0 && (
                      <div className="space-y-4">
                        {educationList.map((edu) => (
                          <div 
                            key={edu.id} 
                            className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
                          >
                            {editingEducation === edu.id ? (
                              // Edit Mode
                              <EducationForm
                                initialData={edu}
                                onSave={(data) => handleUpdateEducation(edu.id, data)}
                                onCancel={() => setEditingEducation(null)}
                              />
                            ) : (
                              // View Mode
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium text-neutral-900 dark:text-white">{edu.institution}</h4>
                                  <p className="text-neutral-600 dark:text-neutral-400">{edu.program}</p>
                                  {(edu.startYear || edu.endYear) && (
                                    <p className="text-sm text-neutral-500">
                                      {edu.startYear || '?'} - {edu.endYear || 'Present'}
                                    </p>
                                  )}
                                  {edu.achievements && (
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{edu.achievements}</p>
                                  )}
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => setEditingEducation(edu.id)}
                                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                                    aria-label="Edit education"
                                  >
                                    <Edit2 className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEducation(edu.id)}
                                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    aria-label="Delete education"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Education Form */}
                    {showEducationForm ? (
                      <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                        <EducationForm
                          onSave={handleAddEducation}
                          onCancel={() => setShowEducationForm(false)}
                        />
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowEducationForm(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-lg transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                        <span>Add Education</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </FormSection>
          )}
        </div>
      </div>

      {/* Image Cropper Modal */}
      {showImageCropper && (
        <ImageCropper
          onSave={handleAvatarUpload}
          onCancel={() => setShowImageCropper(false)}
          aspectRatio={cropperType === 'avatar' ? 1 : 4}
          title={cropperType === 'avatar' ? 'Crop Profile Picture' : 'Crop Banner'}
        />
      )}
    </div>
  );
}

// Helper Components
function FormSection({ title, icon: Icon, children }) {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-lg">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
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
    
    // Validate required fields
    if (!formData.institution.trim() || !formData.program.trim()) {
      return;
    }
    
    // Parse and validate years
    const startYear = formData.startYear ? parseInt(formData.startYear, 10) : null;
    const endYear = formData.endYear ? parseInt(formData.endYear, 10) : null;
    
    // Validate year range
    if (startYear && (startYear < 1900 || startYear > 2035)) {
      toast.error('Start year must be between 1900 and 2035');
      return;
    }
    
    if (endYear && (endYear < 1900 || endYear > 2035)) {
      toast.error('End year must be between 1900 and 2035');
      return;
    }
    
    // Validate end year >= start year
    if (startYear && endYear && endYear < startYear) {
      toast.error('End year must be equal to or after start year');
      return;
    }
    
    onSave({
      institution: formData.institution.trim(),
      program: formData.program.trim(),
      startYear,
      endYear,
      achievements: formData.achievements.trim() || null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Institution <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.institution}
          onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Juilliard School"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Program <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.program}
          onChange={(e) => setFormData(prev => ({ ...prev, program: e.target.value }))}
          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., BFA in Drama"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Start Year
          </label>
          <input
            type="number"
            value={formData.startYear}
            onChange={(e) => setFormData(prev => ({ ...prev, startYear: e.target.value }))}
            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="2018"
            min="1900"
            max="2035"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            End Year
          </label>
          <input
            type="number"
            value={formData.endYear}
            onChange={(e) => setFormData(prev => ({ ...prev, endYear: e.target.value }))}
            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="2022 (or leave blank for present)"
            min="1900"
            max="2035"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Achievements / Notes
        </label>
        <textarea
          value={formData.achievements}
          onChange={(e) => setFormData(prev => ({ ...prev, achievements: e.target.value }))}
          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          rows={2}
          placeholder="e.g., Dean's List, Lead in senior production"
        />
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white rounded-lg font-medium transition-all"
        >
          {initialData.id ? 'Update' : 'Add'} Education
        </button>
      </div>
    </form>
  );
}
