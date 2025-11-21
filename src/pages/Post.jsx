// src/pages/Post.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TagSelector from '../components/forms/TagSelector';
import { validateTags } from '../constants/tags';

const CONTENT_TYPES = [
  { value: 'script', label: 'Script', icon: '📝' },
  { value: 'audition', label: 'Audition', icon: '🎭' },
  { value: 'reading', label: 'Reading', icon: '📖' },
  { value: 'reel', label: 'Reel', icon: '🎬' },
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', description: 'Anyone can view' },
  { value: 'on-request', label: 'On Request', description: 'Visible with link' },
  { value: 'private', label: 'Private', description: 'Only you can view' },
];

export default function Post() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    contentType: '',
    title: '',
    description: '',
    tags: [],
    visibility: 'public',
  });
  
  const [errors, setErrors] = useState({});
  
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.contentType) {
      newErrors.contentType = 'Please select a content type';
    }
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }
    
    if (formData.description.length > 1000) {
      newErrors.description = 'Description must be 1000 characters or less';
    }
    
    const tagValidation = validateTags(formData.tags);
    if (!tagValidation.valid) {
      newErrors.tags = tagValidation.errors[0];
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Focus first error field
      const firstErrorField = Object.keys(errors)[0];
      document.querySelector(`[name="${firstErrorField}"]`)?.focus();
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // TODO: Replace with actual API call
      console.log('Submitting post:', formData);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate('/dashboard');
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to create post' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isFormValid = formData.contentType && formData.title.trim() && formData.tags.length > 0;
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8 text-neutral-900 dark:text-neutral-100">Create New Post</h1>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Content Type */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Content Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CONTENT_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleChange('contentType', type.value)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.contentType === type.value
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900'
                    : 'border-neutral-300 dark:border-neutral-700 hover:border-emerald-300'
                }`}
                aria-pressed={formData.contentType === type.value}
              >
                <div className="text-3xl mb-2">{type.icon}</div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">{type.label}</div>
              </button>
            ))}
          </div>
          {errors.contentType && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">{errors.contentType}</p>
          )}
        </div>
        
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
            Clear, descriptive headline
          </p>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            maxLength={100}
            className="block w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'title-error' : 'title-help'}
          />
          <div className="mt-1 flex justify-between text-sm">
            {errors.title ? (
              <p id="title-error" className="text-red-600 dark:text-red-400" role="alert">{errors.title}</p>
            ) : (
              <p id="title-help" className="text-neutral-500 dark:text-neutral-400">&nbsp;</p>
            )}
            <span className="text-neutral-500 dark:text-neutral-400">{formData.title.length}/100</span>
          </div>
        </div>
        
        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={6}
            maxLength={1000}
            placeholder="Describe context, goals, or feedback needed..."
            className="block w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-neutral-500"
            aria-invalid={!!errors.description}
            aria-describedby="description-count"
          />
          <div className="mt-1 flex justify-between text-sm">
            {errors.description && (
              <p className="text-red-600 dark:text-red-400" role="alert">{errors.description}</p>
            )}
            <span id="description-count" className="text-neutral-500 dark:text-neutral-400 ml-auto">
              {formData.description.length}/1000
            </span>
          </div>
        </div>
        
        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Tags <span className="text-red-500">*</span>
          </label>
          <TagSelector
            value={formData.tags}
            onChange={(tags) => handleChange('tags', tags)}
            error={errors.tags}
          />
        </div>
        
        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Visibility
          </label>
          <div className="space-y-3">
            {VISIBILITY_OPTIONS.map(option => (
              <label
                key={option.value}
                className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.visibility === option.value
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900'
                    : 'border-neutral-300 dark:border-neutral-700 hover:border-emerald-300'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={option.value}
                  checked={formData.visibility === option.value}
                  onChange={(e) => handleChange('visibility', e.target.value)}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">{option.label}</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
        
        {/* Submit Button */}
        <div className="flex gap-4 pt-6 border-t border-neutral-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition text-neutral-900 dark:text-neutral-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Create Post'
            )}
          </button>
        </div>
        
        {errors.submit && (
          <p className="text-red-600 dark:text-red-400 text-center" role="alert">{errors.submit}</p>
        )}
      </form>
    </div>
  );
}
