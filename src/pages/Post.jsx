// src/pages/Post.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, CheckCircle, FileText, Film, Image as ImageIcon, Mic, DollarSign, Music } from 'lucide-react';
import toast from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import TagSelector from '../components/forms/TagSelector';
import { validateTags } from '../constants/tags';
import { useAuth } from '../context/AuthContext';
import { createPost, getAudioUploadUrl, uploadAudioToS3 } from '../services/postService';
import { getUploadUrl, uploadToS3, completeUpload } from '../services/mediaService';
import { getMyProfile } from '../services/profileService';

// Set up PDF.js worker from local package
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const CONTENT_TYPES = [
  { value: 'script', label: 'Script', icon: '📝' },
  { value: 'audition', label: 'Audition', icon: '🎭' },
  { value: 'reel', label: 'Reel', icon: '🎬' },
  { value: 'audio', label: 'Audio', icon: '🎤' },
];

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', description: 'Anyone can view' },
  { value: 'FOLLOWERS_ONLY', label: 'Followers Only', description: 'Only your followers can view' },
];

// Accepted file types per content type
const ACCEPTED_TYPES = {
  script: '.pdf,.doc,.docx',
  audition: '.mp4,.mov,.webm,.mp3,.wav',
  reel: '.mp4,.mov,.webm',
  audio: '.mp3,.wav,.m4a',
};

// Max file sizes in MB
const MAX_FILE_SIZES = {
  script: 10,
  audition: 500,
  reel: 500,
  audio: 100,
};

export default function Post() {
  const navigate = useNavigate();
  const { user, isInitialized } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [profileError, setProfileError] = useState(false);
  
  // Fetch profile ID for media uploads
  useEffect(() => {
    const fetchProfile = async () => {
      // Only fetch if we have a user, don't have a profile ID yet, and haven't errored
      if (user?.id && !profileId && !profileError) {
        try {
          const profile = await getMyProfile();
          if (profile?.id) {
            setProfileId(profile.id);
            setProfileError(false);
          }
        } catch (error) {
          console.warn('Failed to fetch profile for media upload:', error);
          setProfileError(true);
          // Profile will be auto-created on first upload attempt by backend
        }
      }
    };
    fetchProfile();
  }, [user?.id, profileId, profileError]);
  
  // Upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedMediaId, setUploadedMediaId] = useState(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  
  const [formData, setFormData] = useState({
    contentType: '',
    title: '',
    description: '',
    tags: [],
    visibility: 'PUBLIC',
    price: '',
    isFree: true,
    requiresAccess: false,
    allowDownload: false,
    thumbnailUrl: '',
  });
  
  const [errors, setErrors] = useState({});
  
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    // Reset file when content type changes
    if (field === 'contentType') {
      setSelectedFile(null);
      setUploadedMediaId(null);
      setUploadedAudioUrl(null);
      setUploadProgress(0);
      setUploadError(null);
    }
    // Handle "Make Free" checkbox
    if (field === 'isFree' && value === true) {
      setFormData(prev => ({ ...prev, [field]: value, price: '' }));
      return;
    }
  };

  // Get media type for the API
  const getMediaType = (contentType, file) => {
    if (!file) return 'image';
    const extension = file.name.split('.').pop().toLowerCase();
    
    // PDFs and documents
    if (['pdf', 'doc', 'docx'].includes(extension)) return 'pdf';
    // Video files
    if (['mp4', 'mov', 'webm'].includes(extension)) return 'video';
    // Audio files
    if (['mp3', 'wav', 'm4a'].includes(extension)) return 'audio';
    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    
    return 'pdf'; // Default fallback
  };

  /**
   * Generate a thumbnail image from the first page of a PDF
   * @param {File} pdfFile - The PDF file
   * @returns {Promise<Blob>} - JPEG blob of the first page
   */
  const generatePdfThumbnail = async (pdfFile) => {
    try {
      // Read the PDF file as ArrayBuffer
      const arrayBuffer = await pdfFile.arrayBuffer();

      // Load the PDF
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      // Get the first page
      const page = await pdf.getPage(1);

      // Set up canvas for rendering
      const scale = 2; // Higher scale for better quality
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render the page
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Convert canvas to JPEG blob
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          },
          'image/jpeg',
          0.85 // Quality
        );
      });
    } catch (error) {
      console.error('Failed to generate PDF thumbnail:', error);
      throw error;
    }
  };

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Handle drag events
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  };

  // Handle file selection from input
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  };

  // Process file and auto-upload
  const processAndUploadFile = async (file) => {
    const maxSize = MAX_FILE_SIZES[formData.contentType] || 100;

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setUploadError(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Validate file type
    const acceptedTypes = ACCEPTED_TYPES[formData.contentType]?.split(',') || [];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!acceptedTypes.some(type => type.trim() === fileExtension)) {
      setUploadError(`Invalid file type. Accepted: ${ACCEPTED_TYPES[formData.contentType]}`);
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setUploadedMediaId(null);
    setUploadedAudioUrl(null);

    // Auto-upload the file
    await uploadFile(file);
  };

  // Upload file to S3
  const uploadFile = async (file) => {
    const fileToUpload = file || selectedFile;
    if (!fileToUpload) {
      setUploadError('Please select a file first.');
      return;
    }

    // Use profile.id if available, otherwise fall back to user.id
    // Backend will auto-create profile if it doesn't exist
    const targetProfileId = profileId || user?.id;
    if (!targetProfileId) {
      setUploadError('Not logged in. Please log in to upload files.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    // Use the passed file for upload
    const uploadingFile = fileToUpload;

    try {
      // Check if this is an audio-only post type
      if (formData.contentType === 'audio') {
        // Use audio-specific upload flow
        setUploadProgress(5);
        const { uploadUrl, audioUrl } = await getAudioUploadUrl(
          uploadingFile.name,
          uploadingFile.type || 'audio/mpeg'
        );

        // Upload to S3
        await uploadAudioToS3(uploadUrl, uploadingFile, (progress) => {
          setUploadProgress(5 + Math.floor(progress * 0.9)); // 5-95%
        });

        setUploadProgress(100);
        setUploadedAudioUrl(audioUrl);
        toast.success('Audio uploaded successfully!');
      } else {
        // Standard media upload flow
        const mediaType = getMediaType(formData.contentType, uploadingFile);

        // Get content type from file
        const contentType = uploadingFile.type ||
          (mediaType === 'video' ? 'video/mp4' :
           mediaType === 'image' ? 'image/jpeg' :
           'application/pdf');

        // For PDFs, generate and upload thumbnail first
        let posterS3Key = null;
        if (mediaType === 'pdf') {
          try {
            setUploadProgress(2);
            toast.loading('Generating PDF preview...', { id: 'pdf-thumbnail' });

            // Generate thumbnail from first page
            const thumbnailBlob = await generatePdfThumbnail(uploadingFile);
            const thumbnailFile = new File([thumbnailBlob], 'thumbnail.jpg', { type: 'image/jpeg' });

            // Upload thumbnail as image
            setUploadProgress(5);
            const { uploadUrl: thumbUploadUrl, s3Key: thumbS3Key } = await getUploadUrl(
              targetProfileId,
              'image',
              `${formData.title || uploadingFile.name} - Thumbnail`,
              'PDF thumbnail',
              'public',
              'image/jpeg',
              thumbnailFile.size
            );

            await uploadToS3(thumbUploadUrl, thumbnailFile, 'image', () => {});
            posterS3Key = thumbS3Key;
            console.log('PDF thumbnail uploaded, posterS3Key:', posterS3Key);

            toast.success('Preview generated!', { id: 'pdf-thumbnail' });
            setUploadProgress(15);
          } catch (thumbError) {
            console.warn('Failed to generate PDF thumbnail:', thumbError);
            toast.dismiss('pdf-thumbnail');
            // Continue without thumbnail - not a critical error
          }
        }

        // Step 1: Get presigned upload URL for main file
        setUploadProgress(posterS3Key ? 20 : 5);
        const { mediaId, uploadUrl } = await getUploadUrl(
          targetProfileId,
          mediaType,
          formData.title || uploadingFile.name,
          formData.description,
          formData.visibility,
          contentType,
          uploadingFile.size
        );

        // Step 2: Upload main file to S3
        const progressStart = posterS3Key ? 20 : 5;
        await uploadToS3(uploadUrl, uploadingFile, mediaType, (progress) => {
          setUploadProgress(progressStart + Math.floor(progress * 0.7)); // 20-90% or 5-75%
        });

        // Step 3: Complete upload with poster if available
        setUploadProgress(95);
        const completeData = {
          fileSize: uploadingFile.size,
        };
        if (posterS3Key) {
          completeData.posterS3Key = posterS3Key;
          console.log('Completing upload with posterS3Key:', posterS3Key);
        }
        await completeUpload(targetProfileId, mediaId, completeData);

        setUploadProgress(100);
        setUploadedMediaId(mediaId);
        toast.success('File uploaded successfully!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Upload failed. Please try again.');
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Remove selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadedMediaId(null);
    setUploadedAudioUrl(null);
    setUploadProgress(0);
    setUploadError(null);
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
    
    // Validate price if not free
    if (!formData.isFree && formData.price) {
      const priceValue = parseFloat(formData.price);
      if (isNaN(priceValue) || priceValue < 0) {
        newErrors.price = 'Price must be a valid positive number';
      }
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
      // Focus first error field with better targeting
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField === 'contentType') {
        // Focus first content type button
        document.querySelector('[aria-pressed]')?.focus();
      } else {
        // Focus input/textarea by name or id
        const element = document.querySelector(`[name="${firstErrorField}"], #${firstErrorField}`);
        element?.focus();
      }
      return;
    }
    
    // Don't check auth state here - let the API handle 401/403
    // This prevents flaky "not logged in" messages during auth initialization
    
    setIsSubmitting(true);
    
    try {
      // Calculate price value
      const priceValue = 0;
      
      // Prepare post data
      const postPayload = {
        title: formData.title, // Post title
        content: formData.description || formData.title,
        authorId: user?.userId || user?.id, // userId from profile, id from auth
        tags: Array.isArray(formData.tags) ? formData.tags : [],
        media: [], // Legacy field - array of media URLs
        mediaId: uploadedMediaId || null, // New: Link to uploaded Media record
        visibility: formData.visibility || 'PUBLIC', // Post visibility: PUBLIC or FOLLOWERS_ONLY
        // audioUrl removed - not supported in Post schema yet
        price: priceValue, // Post price (0 for free)
        isFree: formData.isFree, // Whether post is free
        thumbnailUrl: formData.thumbnailUrl || null, // Thumbnail URL
        requiresAccess: formData.requiresAccess || false, // Whether access needs to be requested
        allowDownload: formData.allowDownload || false, // Whether download is allowed
      };
      
      // Call API to create post
      await createPost(postPayload);
      
      toast.success('Post created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Create post error:', error);
      
      // Handle specific HTTP error codes with helpful messages
      const status = error?.response?.status;
      let errorMessage = 'Failed to create post';
      
      // Only show "Please log in" if we got 401 from server
      if (status === 401) {
        errorMessage = 'Please log in to create a post';
      } else if (status === 400) {
        errorMessage = error?.response?.data?.message || 'Invalid post data. Please check your inputs.';
      } else if (status === 403) {
        errorMessage = 'You do not have permission to create this post';
      } else if (status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrors({ submit: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isFormValid = formData.contentType && formData.title.trim() && formData.tags.length > 0;
  
  // Show loading state while auth is initializing
  if (!isInitialized) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-neutral-600 dark:text-neutral-400">Loading...</span>
        </div>
      </div>
    );
  }
  
  // Show login prompt if not authenticated after initialization
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-4 text-neutral-900 dark:text-neutral-100">Create New Post</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Please log in to create a post.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white rounded-lg font-semibold transition-all"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }
  
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

        {/* File Upload - Only show when content type is selected */}
        {formData.contentType && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Attach File
            </label>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
              Upload your {formData.contentType} file (max {MAX_FILE_SIZES[formData.contentType]}MB)
            </p>

            {/* File not selected yet - Drop zone */}
            {!selectedFile && !uploadedMediaId && !isUploading && (
              <label
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 bg-neutral-50 dark:bg-neutral-800/50'
                }`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center py-4">
                  <Upload className={`w-8 h-8 mb-2 ${isDragging ? 'text-emerald-500' : 'text-neutral-400'}`} />
                  <p className={`text-sm ${isDragging ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-600 dark:text-neutral-400'}`}>
                    {isDragging ? 'Drop file here' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Accepted: {ACCEPTED_TYPES[formData.contentType]}
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept={ACCEPTED_TYPES[formData.contentType]}
                  onChange={handleFileSelect}
                />
              </label>
            )}

            {/* Uploading progress */}
            {isUploading && (
              <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Uploading...</span>
                  <span className="text-sm font-medium text-emerald-600">{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload complete - Media */}
            {uploadedMediaId && (
              <div className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                    <div>
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        File uploaded successfully
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {selectedFile?.name}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded-lg transition"
                    aria-label="Remove file"
                  >
                    <X className="w-5 h-5 text-emerald-600" />
                  </button>
                </div>
              </div>
            )}

            {/* Upload complete - Audio */}
            {uploadedAudioUrl && (
              <div className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                    <div>
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Audio uploaded successfully
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {selectedFile?.name}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded-lg transition"
                    aria-label="Remove file"
                  >
                    <X className="w-5 h-5 text-emerald-600" />
                  </button>
                </div>
                {/* Audio Preview */}
                <div className="mt-3">
                  <audio controls className="w-full">
                    <source src={uploadedAudioUrl} type={selectedFile?.type || 'audio/mpeg'} />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            )}

            {/* Upload error */}
            {uploadError && (
              <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
              </div>
            )}
          </div>
        )}
        
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

        {/* Pricing */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Pricing
          </label>
          <div className="space-y-4">
            {/* Make Free Checkbox */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isFree}
                onChange={(e) => handleChange('isFree', e.target.checked)}
                className="w-5 h-5 rounded border-neutral-300 dark:border-neutral-700 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-neutral-900 dark:text-neutral-100 font-medium">Make this post free</span>
            </label>
            
            {/* Price Input */}
            <p className="text-sm text-neutral-500 dark:text-neutral-400 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">💳 Paid posts — coming soon. All posts are free for now.</p>
          </div>
        </div>

        {/* Thumbnail Upload */}
        <div>
          <label htmlFor="thumbnailUrl" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Thumbnail URL (Optional)
          </label>
          <input
            type="url"
            id="thumbnailUrl"
            name="thumbnailUrl"
            value={formData.thumbnailUrl}
            onChange={(e) => handleChange('thumbnailUrl', e.target.value)}
            placeholder="https://example.com/thumbnail.jpg"
            className="block w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Add a thumbnail image to make your post more engaging. Leave blank for text-only posts.
          </p>
        </div>

        {/* Access Control */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Access Control
          </label>
          <div className="space-y-3">
            {/* Requires Access Toggle */}
            <label className="flex items-start p-4 rounded-lg border-2 border-neutral-300 dark:border-neutral-700 cursor-pointer hover:border-emerald-300 transition-all">
              <input
                type="checkbox"
                checked={formData.requiresAccess}
                onChange={(e) => handleChange('requiresAccess', e.target.checked)}
                className="mt-1 mr-3 w-5 h-5 rounded border-neutral-300 dark:border-neutral-700 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">Require Access Request</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  Users must request (or pay) before they can view the post content
                </div>
              </div>
            </label>

            {/* Allow Download Toggle */}
            <label className="flex items-start p-4 rounded-lg border-2 border-neutral-300 dark:border-neutral-700 cursor-pointer hover:border-emerald-300 transition-all">
              <input
                type="checkbox"
                checked={formData.allowDownload}
                onChange={(e) => handleChange('allowDownload', e.target.checked)}
                className="mt-1 mr-3 w-5 h-5 rounded border-neutral-300 dark:border-neutral-700 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">Allow Downloads</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  Allow users to download content (with watermark)
                </div>
              </div>
            </label>
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
