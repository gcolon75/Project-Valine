// src/pages/ProfileEdit.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, MapPin, Briefcase, GraduationCap, Award, 
  Link as LinkIcon, Film, FileText, Plus, X, Save, ArrowLeft
} from 'lucide-react';
import ImageCropper from '../components/ImageCropper';
import MediaUploader from '../components/MediaUploader';
import SkillsTags from '../components/SkillsTags';
import ProfileLinksEditor from '../components/ProfileLinksEditor';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { getProfile, updateMyProfile, batchUpdateProfileLinks } from '../services/profileService';
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
    headline: user?.headline || '',
    title: user?.title || '',
    pronouns: user?.pronouns || '',
    location: user?.location || '',
    availabilityStatus: user?.availabilityStatus || 'available',
    primaryRoles: user?.primaryRoles || [],
    bio: user?.bio || '',
    languages: user?.languages || [],
    avatar: user?.avatar || null,
    banner: user?.banner || null,
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

  // Load profile from backend on mount if feature is enabled
  useEffect(() => {
    const loadProfile = async () => {
      if (BACKEND_LINKS_ENABLED && user?.id) {
        setIsLoadingProfile(true);
        try {
          const profile = await getProfile(user.id);
          // Update form data with backend profile
          if (profile) {
            setFormData(prev => ({
              ...prev,
              title: profile.title || prev.title,
              headline: profile.headline || prev.headline,
              profileLinks: profile.links || prev.profileLinks
            }));
          }
        } catch (error) {
          console.error('Failed to load profile from backend:', error);
          // Continue with existing data
        } finally {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();
  }, [BACKEND_LINKS_ENABLED, user?.id]);

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
    'Producer', 'Composer', 'Designer', 'Technician'
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

  const handleAvatarUpload = (imageUrl) => {
    handleChange('avatar', imageUrl);
    setShowImageCropper(false);
  };

  const handleBannerUpload = async (file, onProgress) => {
    if (!user?.id) {
      toast.error('You must be logged in to upload media');
      return;
    }

    setUploadingBanner(true);
    const toastId = toast.loading('Uploading banner...');

    try {
      const result = await uploadMedia(user.id, file, 'image', {
        title: 'Profile Banner',
        description: 'Cover banner for profile',
        privacy: 'public',
        onProgress,
      });

      // Update form data with the media URL (when available from backend)
      // For now, use a temporary URL
      const tempUrl = URL.createObjectURL(file);
      handleChange('banner', tempUrl);

      // Track media upload
      const sizeBucket = file.size < 1024 * 1024 ? 'small' : file.size < 5 * 1024 * 1024 ? 'medium' : 'large';
      trackMediaUpload('image', sizeBucket);

      toast.success('Banner uploaded successfully!', { id: toastId });
    } catch (error) {
      console.error('Banner upload failed:', error);
      toast.error(error.message || 'Failed to upload banner', { id: toastId });
      throw error;
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleReelUpload = async (file, onProgress) => {
    if (!user?.id) {
      toast.error('You must be logged in to upload media');
      return;
    }

    setUploadingReel(true);
    const toastId = toast.loading('Uploading reel...');

    try {
      const result = await uploadMedia(user.id, file, 'video', {
        title: formData.reelPrivacy === 'public' ? 'Demo Reel' : 'Private Reel',
        description: 'Primary demo reel',
        privacy: formData.reelPrivacy,
        onProgress,
      });

      // Update form data with the media URL (when available from backend)
      // For now, use a temporary URL
      const tempUrl = URL.createObjectURL(file);
      handleChange('primaryReel', tempUrl);

      // Track media upload
      const sizeBucket = file.size < 10 * 1024 * 1024 ? 'small' : file.size < 50 * 1024 * 1024 ? 'medium' : 'large';
      trackMediaUpload('video', sizeBucket);

      toast.success('Reel uploaded successfully!', { id: toastId });
    } catch (error) {
      console.error('Reel upload failed:', error);
      toast.error(error.message || 'Failed to upload reel', { id: toastId });
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
        headline: sanitizeText(formData.headline),
        title: sanitizeText(formData.title),
        bio: sanitizeText(formData.bio),
        location: sanitizeText(formData.location),
        pronouns: sanitizeText(formData.pronouns),
      };
      
      // Validate headline length
      if (sanitizedData.headline && sanitizedData.headline.length > 100) {
        toast.error('Headline must be 100 characters or less');
        return;
      }

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
        // Backend API integration - always call updateMyProfile when user is authenticated
        if (user?.id) {
          // Build profile update with all editable fields
          const profileUpdate = {
            displayName: sanitizedData.displayName,
            username: sanitizedData.username,
            headline: sanitizedData.headline,
            title: sanitizedData.title,
            bio: sanitizedData.bio,
            location: sanitizedData.location,
            pronouns: sanitizedData.pronouns,
            primaryRoles: sanitizedData.primaryRoles,
            skills: sanitizedData.skills,
            avatarUrl: sanitizedData.avatar,
            links: sanitizedData.profileLinks
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

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'media', label: 'Media', icon: Film },
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

                  <FormField label="Headline" required>
                    <input
                      type="text"
                      value={formData.headline}
                      onChange={(e) => handleChange('headline', e.target.value)}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Voice & stage actor — classical & contemporary"
                      maxLength={100}
                    />
                    <p className="text-xs text-neutral-500 dark:text-neutral-600 mt-1">
                      {formData.headline.length}/100 characters
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
                      {roleOptions.map(role => (
                        <label key={role} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.primaryRoles.includes(role)}
                            onChange={(e) => {
                              if (e.target.checked) {
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

          {/* Media Section */}
          {activeSection === 'media' && (
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
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Add your professional experience, productions, and credits
                </p>
                <button className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-lg transition-colors">
                  <Plus className="w-5 h-5" />
                  <span>Add Credit</span>
                </button>
              </div>
            </FormSection>
          )}

          {/* Education Section */}
          {activeSection === 'education' && (
            <FormSection title="Education & Training" icon={GraduationCap}>
              <div className="space-y-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Add your education, training programs, and certifications
                </p>
                <button className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-lg transition-colors">
                  <Plus className="w-5 h-5" />
                  <span>Add Education</span>
                </button>
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
