// src/pages/Post.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Check, CheckCircle, FileText, Film, Camera, Megaphone, Link as LinkIcon, Loader2 } from 'lucide-react';
import { parseVideoEmbed } from '../utils/videoEmbed';
import toast from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import TagSelector from '../components/forms/TagSelector';
import { validateTags } from '../constants/tags';
import { useAuth } from '../context/AuthContext';
import { createPost, getAudioUploadUrl, uploadAudioToS3 } from '../services/postService';
import { getUploadUrl, uploadToS3, completeUpload } from '../services/mediaService';
import { getMyProfile } from '../services/profileService';
import MentionTextarea from '../components/MentionTextarea';

// Set up PDF.js worker from local package
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const CONTENT_TYPES = [
  { value: 'script',       label: 'Script',       icon: FileText  },
  { value: 'reel',         label: 'Film / Reel',  icon: Film      },
  { value: 'headshots',    label: 'Headshots',    icon: Camera    },
  { value: 'casting_call', label: 'Casting Call', icon: Megaphone },
];

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC',          label: 'Public',         description: 'Anyone can view' },
  { value: 'FOLLOWERS_ONLY',  label: 'Network Only', description: 'Only your network can view' },
];

// Accepted file types per content type
const ACCEPTED_TYPES = {
  script:       '.pdf,.doc,.docx',
  reel:         '.mp4,.mov,.webm',
  headshots:    '.jpg,.jpeg,.png,.webp',
  casting_call: '.pdf,.doc,.docx',
};

// Max file sizes in MB
const MAX_FILE_SIZES = {
  script:       10,
  reel:         500,
  headshots:    20,
  casting_call: 10,
};

export default function Post() {
  const navigate = useNavigate();
  const { user, isInitialized } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
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

  // Video embed state (YouTube / Vimeo)
  const [videoLinkInput, setVideoLinkInput] = useState('');
  const [videoEmbedUrl, setVideoEmbedUrl] = useState(null);
  const [videoLinkError, setVideoLinkError] = useState(null);

  // Custom thumbnail state
  const [useCustomThumbnail, setUseCustomThumbnail] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

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
    allowFeedback: false,
    includeWatermark: false,
    thumbnailUrl: '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));

    if (field === 'contentType') {
      setSelectedFile(null);
      setUploadedMediaId(null);
      setUploadedAudioUrl(null);
      setUploadProgress(0);
      setUploadError(null);
      setVideoLinkInput('');
      setVideoEmbedUrl(null);
      setVideoLinkError(null);
      setFormData(prev => ({ ...prev, [field]: value, includeWatermark: value === 'script' }));
      return;
    }
    if (field === 'isFree' && value === true) {
      setFormData(prev => ({ ...prev, [field]: value, price: '', requiresAccess: false }));
      return;
    }
    if (field === 'isFree' && value === false) {
      setFormData(prev => ({ ...prev, [field]: value, requiresAccess: true }));
      return;
    }
  };

  const getMediaType = (contentType, file) => {
    if (!file) return 'image';
    const extension = file.name.split('.').pop().toLowerCase();
    if (['pdf', 'doc', 'docx'].includes(extension)) return 'pdf';
    if (['mp4', 'mov', 'webm'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'm4a'].includes(extension)) return 'audio';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    return 'pdf';
  };

  const generatePdfThumbnail = async (pdfFile) => {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const scale = 2;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Failed to create thumbnail blob')),
          'image/jpeg',
          0.85
        );
      });
    } catch (error) {
      console.error('Failed to generate PDF thumbnail:', error);
      throw error;
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver  = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processAndUploadFile(file);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) processAndUploadFile(file);
  };

  const processAndUploadFile = async (file) => {
    const maxSize = MAX_FILE_SIZES[formData.contentType] || 100;
    if (file.size > maxSize * 1024 * 1024) {
      setUploadError(`File size must be less than ${maxSize}MB`);
      return;
    }
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
    setVideoLinkInput('');
    setVideoEmbedUrl(null);
    setVideoLinkError(null);
    await uploadFile(file);
  };

  const uploadFile = async (file) => {
    const fileToUpload = file || selectedFile;
    if (!fileToUpload) { setUploadError('Please select a file first.'); return; }

    const targetProfileId = profileId || user?.id;
    if (!targetProfileId) { setUploadError('Not logged in. Please log in to upload files.'); return; }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const uploadingFile = fileToUpload;

    try {
      if (formData.contentType === 'audio') {
        // Legacy audio-only upload path
        setUploadProgress(5);
        const { uploadUrl, audioUrl } = await getAudioUploadUrl(
          uploadingFile.name, uploadingFile.type || 'audio/mpeg'
        );
        await uploadAudioToS3(uploadUrl, uploadingFile, (progress) => {
          setUploadProgress(5 + Math.floor(progress * 0.9));
        });
        setUploadProgress(100);
        setUploadedAudioUrl(audioUrl);
        toast.success('Audio uploaded successfully!');
      } else {
        const mediaType = getMediaType(formData.contentType, uploadingFile);
        const contentType = uploadingFile.type ||
          (mediaType === 'video' ? 'video/mp4' : mediaType === 'image' ? 'image/jpeg' : 'application/pdf');

        let posterS3Key = null;
        if (mediaType === 'pdf') {
          try {
            setUploadProgress(2);
            toast.loading('Generating PDF preview...', { id: 'pdf-thumbnail' });
            const thumbnailBlob = await generatePdfThumbnail(uploadingFile);
            const thumbnailFile = new File([thumbnailBlob], 'thumbnail.jpg', { type: 'image/jpeg' });
            setUploadProgress(5);
            const { uploadUrl: thumbUploadUrl, s3Key: thumbS3Key } = await getUploadUrl(
              targetProfileId, 'image',
              `${formData.title || uploadingFile.name} - Thumbnail`,
              'PDF thumbnail', 'public', 'image/jpeg', thumbnailFile.size
            );
            await uploadToS3(thumbUploadUrl, thumbnailFile, 'image', () => {});
            posterS3Key = thumbS3Key;
            toast.success('Preview generated!', { id: 'pdf-thumbnail' });
            setUploadProgress(15);
          } catch (thumbError) {
            console.warn('Failed to generate PDF thumbnail:', thumbError);
            toast.dismiss('pdf-thumbnail');
          }
        }

        setUploadProgress(posterS3Key ? 20 : 5);
        const { mediaId, uploadUrl } = await getUploadUrl(
          targetProfileId, mediaType,
          formData.title || uploadingFile.name,
          formData.description, formData.visibility, contentType, uploadingFile.size
        );

        const progressStart = posterS3Key ? 20 : 5;
        await uploadToS3(uploadUrl, uploadingFile, mediaType, (progress) => {
          setUploadProgress(progressStart + Math.floor(progress * 0.7));
        });

        setUploadProgress(95);
        const completeData = { fileSize: uploadingFile.size };
        if (posterS3Key) { completeData.posterS3Key = posterS3Key; }
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

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadedMediaId(null);
    setUploadedAudioUrl(null);
    setUploadProgress(0);
    setUploadError(null);
  };

  const handleVideoLinkChange = (e) => {
    const val = e.target.value;
    setVideoLinkInput(val);
    setVideoLinkError(null);
    if (!val.trim()) { setVideoEmbedUrl(null); return; }
    const parsed = parseVideoEmbed(val.trim());
    if (parsed) {
      setVideoEmbedUrl(parsed.embedUrl);
      setSelectedFile(null);
      setUploadedMediaId(null);
      setUploadedAudioUrl(null);
      setUploadProgress(0);
      setUploadError(null);
    } else {
      setVideoEmbedUrl(null);
      setVideoLinkError('Not a valid YouTube or Vimeo URL');
    }
  };

  const handleThumbnailFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Thumbnail must be less than 5MB'); return; }
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.contentType) newErrors.contentType = 'Please select a content type';
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    else if (formData.title.length > 100) newErrors.title = 'Title must be 100 characters or less';
    if (!formData.isFree) {
      const priceValue = parseFloat(formData.price);
      if (!formData.price || isNaN(priceValue) || priceValue < 0.50) newErrors.price = 'Price must be at least $0.50';
    }
    if (formData.description.length > 1000) newErrors.description = 'Description must be 1000 characters or less';
    if (!formData.tags || formData.tags.length === 0) newErrors.tags = 'Please add at least one tag';
    else {
      const tagValidation = validateTags(formData.tags);
      if (!tagValidation.valid) newErrors.tags = tagValidation.errors[0];
    }
    if (formData.contentType) {
      const hasFile = uploadedMediaId || uploadedAudioUrl;
      const hasVideo = !!videoEmbedUrl;
      if (formData.contentType === 'reel' ? (!hasFile && !hasVideo) : !hasFile) {
        newErrors.file = formData.contentType === 'reel'
          ? 'Please upload a file or paste a video link'
          : 'Please upload a file';
      }
    }
    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      // Show the first error as a toast so the user knows exactly what's missing
      const firstError = Object.values(validationErrors)[0];
      toast.error(firstError);
      // Scroll the first invalid field into view
      const firstField = Object.keys(validationErrors)[0];
      const el = firstField === 'contentType'
        ? document.querySelector('[aria-pressed]')
        : document.querySelector(`[name="${firstField}"], #${firstField}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload custom thumbnail if provided
      let customThumbnailUrl = null;
      if (useCustomThumbnail && thumbnailFile) {
        setUploadingThumbnail(true);
        try {
          const targetProfileId = profileId || user?.id;
          const { mediaId: thumbMediaId, uploadUrl: thumbUploadUrl } = await getUploadUrl(
            targetProfileId, 'image',
            `${formData.title || 'post'} - Thumbnail`,
            'Post thumbnail', 'public', thumbnailFile.type, thumbnailFile.size
          );
          await uploadToS3(thumbUploadUrl, thumbnailFile, 'image', () => {});
          const thumbData = await completeUpload(targetProfileId, thumbMediaId, { fileSize: thumbnailFile.size });
          customThumbnailUrl = thumbData?.url || thumbData?.mediaUrl || thumbData?.media?.url || null;
        } catch (err) {
          console.warn('Failed to upload thumbnail:', err);
          toast.error('Thumbnail upload failed — posting without thumbnail');
        } finally {
          setUploadingThumbnail(false);
        }
      }

      const priceValue = formData.isFree ? 0 : parseFloat(formData.price) || 0;
      const postPayload = {
        title: formData.title,
        content: formData.description || formData.title,
        authorId: user?.userId || user?.id,
        tags: Array.isArray(formData.tags) ? formData.tags : [],
        media: videoEmbedUrl ? [videoEmbedUrl] : [],
        mediaId: uploadedMediaId || null,
        visibility: formData.visibility || 'PUBLIC',
        audioUrl: uploadedAudioUrl || null,
        contentType: formData.contentType || null,
        price: priceValue,
        isFree: formData.isFree,
        thumbnailUrl: customThumbnailUrl || null,
        requiresAccess: formData.requiresAccess || false,
        allowDownload: formData.allowDownload || false,
        allowFeedback: formData.allowFeedback || false,
        includeWatermark: formData.includeWatermark || false,
      };
      await createPost(postPayload);
      toast.success('Post created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Create post error:', error);
      const status = error?.response?.status;
      let errorMessage = 'Failed to create post';
      if (status === 401) errorMessage = 'Please log in to create a post';
      else if (status === 400) errorMessage = error?.response?.data?.message || 'Invalid post data. Please check your inputs.';
      else if (status === 403) errorMessage = 'You do not have permission to create this post';
      else if (status >= 500) errorMessage = 'Server error. Please try again later.';
      else if (error.message) errorMessage = error.message;
      setErrors({ submit: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasMedia = !!(uploadedMediaId || uploadedAudioUrl || videoEmbedUrl);
  const isFormValid = formData.contentType && formData.title.trim() && formData.tags.length > 0 && hasMedia;

  if (!isInitialized) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-[#0CCE6B] animate-spin" />
          <span className="ml-3 text-neutral-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4 text-neutral-900">Create New Post</h1>
          <p className="text-neutral-500 mb-6">Please log in to create a post.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:opacity-90 text-white rounded-lg font-semibold transition-opacity"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-8 text-neutral-900">Create New Post</h1>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Content Type */}
        <div data-demo="content-type">
          <label className="block text-sm font-medium text-neutral-700 mb-3">
            Content Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CONTENT_TYPES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleChange('contentType', value)}
                className={`p-4 rounded-lg border transition-colors text-left ${
                  formData.contentType === value
                    ? 'border-[#0CCE6B] bg-[#0CCE6B]/5'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
                aria-pressed={formData.contentType === value}
              >
                <Icon
                  className={`w-8 h-8 mb-3 ${formData.contentType === value ? 'text-[#0CCE6B]' : 'text-neutral-400'}`}
                  aria-hidden="true"
                />
                <div className="text-sm font-medium text-neutral-900">{label}</div>
              </button>
            ))}
          </div>
          {errors.contentType && (
            <p className="mt-2 text-sm text-red-600" role="alert">{errors.contentType}</p>
          )}
        </div>

        {/* Title */}
        <div data-demo="post-title">
          <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-neutral-500 mb-2">Clear, descriptive headline</p>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            maxLength={100}
            className="block w-full px-4 py-2.5 border border-neutral-200 bg-white text-neutral-900 rounded-lg focus:outline-none focus:border-[#0CCE6B] transition-colors"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'title-error' : 'title-help'}
          />
          <div className="mt-1 flex justify-between text-sm">
            {errors.title ? (
              <p id="title-error" className="text-red-600" role="alert">{errors.title}</p>
            ) : (
              <p id="title-help" className="text-neutral-400">&nbsp;</p>
            )}
            <span className="text-neutral-400">{formData.title.length}/100</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-2">
            Description
          </label>
          <MentionTextarea
            value={formData.description}
            onChange={(val) => setFormData(prev => ({ ...prev, description: val }))}
            rows={6}
            placeholder="Describe context, goals, or feedback needed..."
            className="block w-full px-4 py-2.5 border border-neutral-200 bg-white text-neutral-900 rounded-lg focus:outline-none focus:border-[#0CCE6B] transition-colors placeholder:text-neutral-400"
          />
          <div className="mt-1 flex justify-between text-sm">
            {errors.description && (
              <p className="text-red-600" role="alert">{errors.description}</p>
            )}
            <span className="text-neutral-400 ml-auto">{formData.description.length}/1000</span>
          </div>
        </div>

        {/* File Upload */}
        {formData.contentType && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Attach File <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-neutral-500 mb-3">
              Upload your {CONTENT_TYPES.find(t => t.value === formData.contentType)?.label.toLowerCase()} file
              {MAX_FILE_SIZES[formData.contentType] && ` (max ${MAX_FILE_SIZES[formData.contentType]}MB)`}
            </p>

            {/* Video embed link — reel only */}
            {formData.contentType === 'reel' && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <LinkIcon className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm font-medium text-neutral-700">Paste a YouTube or Vimeo link</span>
                </div>
                <input
                  type="url"
                  value={videoLinkInput}
                  onChange={handleVideoLinkChange}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                  className="block w-full px-4 py-2.5 border border-neutral-200 bg-white text-neutral-900 rounded-lg focus:outline-none focus:border-[#0CCE6B] transition-colors placeholder:text-neutral-400"
                />
                {videoLinkError && (
                  <p className="mt-1 text-sm text-red-600">{videoLinkError}</p>
                )}
                {videoEmbedUrl && (
                  <div className="mt-3 rounded-lg overflow-hidden aspect-video relative border border-neutral-200">
                    <iframe
                      src={videoEmbedUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Video preview"
                    />
                    <button
                      type="button"
                      onClick={() => { setVideoLinkInput(''); setVideoEmbedUrl(null); setVideoLinkError(null); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded transition"
                      aria-label="Remove video link"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {!videoEmbedUrl && (
                  <div className="relative flex items-center my-4">
                    <div className="flex-1 border-t border-neutral-200" />
                    <span className="mx-3 text-xs text-neutral-400">or upload a file</span>
                    <div className="flex-1 border-t border-neutral-200" />
                  </div>
                )}
              </div>
            )}

            {/* Drop zone */}
            {!selectedFile && !uploadedMediaId && !isUploading && !videoEmbedUrl && (
              <label
                className={`flex flex-col items-center justify-center w-full h-32 border border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-[#0CCE6B] bg-[#0CCE6B]/5'
                    : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50'
                }`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center py-4">
                  <Upload className={`w-6 h-6 mb-2 ${isDragging ? 'text-[#0CCE6B]' : 'text-neutral-400'}`} />
                  <p className={`text-sm ${isDragging ? 'text-[#0CCE6B]' : 'text-neutral-500'}`}>
                    {isDragging ? 'Drop file here' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
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
            {isUploading && !videoEmbedUrl && (
              <div className="border border-neutral-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-700">Uploading...</span>
                  <span className="text-sm font-medium text-[#0CCE6B]">{uploadProgress}%</span>
                </div>
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0CCE6B] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload complete - Media */}
            {uploadedMediaId && (
              <div className="border border-[#0CCE6B]/30 bg-[#0CCE6B]/5 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[#0CCE6B] shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">File uploaded successfully</p>
                      <p className="text-xs text-neutral-500">{selectedFile?.name}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 hover:bg-neutral-100 rounded transition"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4 text-neutral-500" />
                  </button>
                </div>
              </div>
            )}

            {/* Upload complete - Audio */}
            {uploadedAudioUrl && (
              <div className="border border-[#0CCE6B]/30 bg-[#0CCE6B]/5 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[#0CCE6B] shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Audio uploaded successfully</p>
                      <p className="text-xs text-neutral-500">{selectedFile?.name}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 hover:bg-neutral-100 rounded transition"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4 text-neutral-500" />
                  </button>
                </div>
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
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{uploadError}</p>
              </div>
            )}
            {errors.file && (
              <p className="mt-2 text-sm text-red-600" role="alert">{errors.file}</p>
            )}
          </div>
        )}

        {/* Tags */}
        <div data-demo="post-tags">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Tags <span className="text-red-500">*</span>
          </label>
          <TagSelector
            value={formData.tags}
            onChange={(tags) => handleChange('tags', tags)}
            error={errors.tags}
          />
        </div>

        {/* Visibility */}
        <div data-demo="post-visibility">
          <label className="block text-sm font-medium text-neutral-700 mb-3">
            Visibility
          </label>
          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map(option => (
              <label
                key={option.value}
                className={`flex items-start p-4 rounded-lg border cursor-pointer transition-colors ${
                  formData.visibility === option.value
                    ? 'border-[#0CCE6B] bg-[#0CCE6B]/5'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={option.value}
                  checked={formData.visibility === option.value}
                  onChange={(e) => handleChange('visibility', e.target.value)}
                  className="sr-only"
                />
                <div className={`mt-0.5 mr-3 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  formData.visibility === option.value ? 'border-emerald-400' : 'border-neutral-300'
                }`}>
                  {formData.visibility === option.value && (
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-neutral-900">{option.label}</div>
                  <div className="text-sm text-neutral-500">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-3">
            Pricing
          </label>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isFree}
                onChange={(e) => handleChange('isFree', e.target.checked)}
                className="w-5 h-5 rounded border-neutral-300 accent-[#0CCE6B]"
              />
              <span className="text-sm font-medium text-neutral-900">Make this post free</span>
            </label>

            {!formData.isFree && (
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-neutral-700 mb-1">
                  Price (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    min="0.50"
                    step="0.01"
                    placeholder="0.50"
                    className="w-full pl-7 pr-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-[#0CCE6B] transition-colors"
                  />
                </div>
                {errors.price && <p className="text-red-600 text-sm mt-1">{errors.price}</p>}
                <p className="text-xs text-neutral-400 mt-1">Minimum price: $0.50. A 15% platform fee applies.</p>
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail */}
        <div>
          <p className="text-sm font-medium text-neutral-700 mb-1">Thumbnail <span className="font-normal text-neutral-400">(Optional)</span></p>
          <p className="text-xs text-neutral-400 mb-3">
            By default, the thumbnail is generated automatically from the first page or image of your file.
          </p>

          {/* Checkbox */}
          <label className="flex items-center gap-3 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={useCustomThumbnail}
              onChange={(e) => {
                setUseCustomThumbnail(e.target.checked);
                if (!e.target.checked) { setThumbnailFile(null); setThumbnailPreview(null); }
              }}
              className="w-5 h-5 rounded border-neutral-300 accent-[#0CCE6B]"
            />
            <span className="text-sm font-medium text-neutral-900">Upload custom thumbnail</span>
          </label>

          {useCustomThumbnail && (
            thumbnailPreview ? (
              <div className="relative inline-block">
                <img src={thumbnailPreview} alt="Thumbnail preview" className="h-32 object-cover border border-neutral-200" />
                <button
                  type="button"
                  onClick={() => { setThumbnailFile(null); setThumbnailPreview(null); }}
                  className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-neutral-200 cursor-pointer hover:border-neutral-400 transition-colors">
                <Upload className="w-5 h-5 text-neutral-400 mb-1" />
                <span className="text-xs text-neutral-500">Click to upload image</span>
                <span className="text-xs text-neutral-400 mt-0.5">JPG, PNG, WebP · Max 5MB</span>
                <input type="file" accept="image/*" onChange={handleThumbnailFileSelect} className="sr-only" />
              </label>
            )
          )}
        </div>

        {/* Access Control */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-3">
            Access Control
          </label>
          <div className="space-y-2">
            <label className="flex items-start p-4 rounded-lg border border-neutral-200 cursor-pointer hover:border-neutral-300 transition-colors">
              <input
                type="checkbox"
                checked={formData.requiresAccess}
                onChange={(e) => handleChange('requiresAccess', e.target.checked)}
                className="mt-0.5 mr-3 w-5 h-5 rounded border-neutral-300 accent-[#0CCE6B]"
              />
              <div>
                <div className="text-sm font-medium text-neutral-900">Require Access Request</div>
                <div className="text-sm text-neutral-500">
                  Users must request (or pay) before they can view the post content
                </div>
              </div>
            </label>

            <label className="flex items-start p-4 rounded-lg border border-neutral-200 cursor-pointer hover:border-neutral-300 transition-colors">
              <input
                type="checkbox"
                checked={formData.allowDownload}
                onChange={(e) => handleChange('allowDownload', e.target.checked)}
                className="mt-0.5 mr-3 w-5 h-5 rounded border-neutral-300 accent-[#0CCE6B]"
              />
              <div>
                <div className="text-sm font-medium text-neutral-900">Allow Downloads</div>
                <div className="text-sm text-neutral-500">Allow users to download content (with watermark)</div>
              </div>
            </label>

            {formData.contentType === 'script' && (
              <label className="flex items-start p-4 rounded-lg border border-neutral-200 cursor-pointer hover:border-neutral-300 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.includeWatermark}
                  onChange={(e) => handleChange('includeWatermark', e.target.checked)}
                  className="mt-0.5 mr-3 w-5 h-5 rounded border-neutral-300 accent-[#0CCE6B]"
                />
                <div>
                  <div className="text-sm font-medium text-neutral-900">Include Watermark</div>
                  <div className="text-sm text-neutral-500">Add a watermark to downloaded PDFs to protect your work</div>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-6 border-t border-neutral-200">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors text-neutral-700 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || uploadingThumbnail || !isFormValid}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:opacity-90 text-white rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity text-sm"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </span>
            ) : (
              'Create Post'
            )}
          </button>
        </div>

        {errors.submit && (
          <p className="text-red-600 text-center text-sm" role="alert">{errors.submit}</p>
        )}
      </form>
    </div>
  );
}
