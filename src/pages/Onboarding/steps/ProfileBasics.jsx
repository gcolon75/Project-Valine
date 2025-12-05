// src/pages/Onboarding/steps/ProfileBasics.jsx
import { useState, useEffect } from 'react';
import { User, MapPin, Briefcase } from 'lucide-react';
import ImageCropper from '../../../components/ImageCropper';
import Button from '../../../components/ui/Button';

/**
 * ProfileBasics Step - Core profile information
 * Includes: display name, title (professional title), location, avatar upload
 * Note: Headline field removed per product decision - only Professional Title is used
 */
export default function ProfileBasics({ userData, onUpdate }) {
  const [showCropper, setShowCropper] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    displayName: userData?.displayName || '',
    title: userData?.title || '',
    location: userData?.location || '',
    avatar: userData?.avatar || null,
  });

  // Validate form data
  const validate = () => {
    const newErrors = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (formData.displayName.length > 100) {
      newErrors.displayName = 'Display name must be 100 characters or less';
    }

    if (formData.title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Update parent component when form data changes
  useEffect(() => {
    if (validate()) {
      onUpdate(formData);
    }
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarSave = (imageData) => {
    setFormData(prev => ({ ...prev, avatar: imageData }));
    setShowCropper(false);
  };

  return (
    <div className="space-y-6">
      {/* Avatar Upload */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 border-4 border-white dark:border-neutral-900 shadow-lg">
            {formData.avatar ? (
              <img
                src={formData.avatar}
                alt="Profile avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-12 h-12 text-neutral-400 dark:text-neutral-600" />
              </div>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 shadow-lg"
            onClick={() => setShowCropper(true)}
            aria-label="Upload profile photo"
          >
            {formData.avatar ? 'Change Photo' : 'Add Photo'}
          </Button>
        </div>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-3 text-center">
          Recommended: Square image, at least 400x400px
        </p>
      </div>

      {/* Display Name */}
      <div>
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-neutral-900 dark:text-white mb-2"
        >
          Display Name <span className="text-red-500" aria-label="required">*</span>
        </label>
        <input
          type="text"
          id="displayName"
          name="displayName"
          value={formData.displayName}
          onChange={handleChange}
          maxLength={100}
          required
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent"
          placeholder="Your professional name"
          aria-required="true"
          aria-invalid={!!errors.displayName}
          aria-describedby={errors.displayName ? 'displayName-error' : 'displayName-hint'}
        />
        {errors.displayName ? (
          <p id="displayName-error" className="text-sm text-red-600 dark:text-red-400 mt-1" role="alert">
            {errors.displayName}
          </p>
        ) : (
          <p id="displayName-hint" className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            {formData.displayName.length}/100 characters
          </p>
        )}
      </div>

      {/* Professional Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-neutral-900 dark:text-white mb-2"
        >
          Professional Title
        </label>
        <div className="relative">
          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-600" aria-hidden="true" />
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            maxLength={100}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent"
            placeholder="e.g., Voice Actor, Casting Director"
            aria-describedby="title-hint"
          />
        </div>
        <p id="title-hint" className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
          {formData.title.length}/100 characters
        </p>
      </div>

      {/* Location */}
      <div>
        <label
          htmlFor="location"
          className="block text-sm font-medium text-neutral-900 dark:text-white mb-2"
        >
          Location
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-600" aria-hidden="true" />
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent"
            placeholder="e.g., Los Angeles, CA"
            aria-describedby="location-hint"
          />
        </div>
        <p id="location-hint" className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
          City and state/country where you're based
        </p>
      </div>

      {/* Image Cropper Modal */}
      {showCropper && (
        <ImageCropper
          onSave={handleAvatarSave}
          onCancel={() => setShowCropper(false)}
          aspectRatio={1}
          title="Upload Profile Photo"
        />
      )}
    </div>
  );
}
