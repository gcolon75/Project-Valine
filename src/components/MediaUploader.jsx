// src/components/MediaUploader.jsx
import { useState, useRef } from 'react';
import { Upload, X, Film, Image as ImageIcon, FileText, CheckCircle } from 'lucide-react';

/**
 * MediaUploader Component
 * Handles file uploads with progress indication and preview
 */
export default function MediaUploader({
  onUpload,
  acceptedTypes = "image/*,video/*",
  maxSize = 100, // MB
  uploadType = "media", // media, image, video, document
  showPreview = true,
  onProgress = null, // Optional external progress callback
  allowRetry = true // Allow retry on failure
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [lastFile, setLastFile] = useState(null);
  const fileInputRef = useRef(null);

  const getIcon = () => {
    switch (uploadType) {
      case 'image': return ImageIcon;
      case 'video': return Film;
      case 'document': return FileText;
      default: return Upload;
    }
  };

  const Icon = getIcon();

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Validate file type
    const acceptedTypesArray = acceptedTypes.split(',').map(t => t.trim());
    const isValidType = acceptedTypesArray.some(type => {
      if (type === '*/*') return true;
      if (type.endsWith('/*')) {
        const category = type.split('/')[0];
        return file.type.startsWith(category + '/');
      }
      return file.type === type;
    });

    if (!isValidType) {
      setError(`Invalid file type. Accepted types: ${acceptedTypes}`);
      return;
    }

    setLastFile(file);
    await performUpload(file);
  };

  const performUpload = async (file) => {
    setError(null);
    setUploading(true);
    setProgress(0);

    // Create preview
    if (showPreview && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    }

    try {
      // Call the upload handler with progress tracking
      await onUpload(file, (progressValue) => {
        setProgress(progressValue);
        if (onProgress) {
          onProgress(progressValue);
        }
      });
      
      // Ensure we show 100% before hiding
      setProgress(100);
      
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 1000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed. Please try again.');
      setUploading(false);
      setProgress(0);
      setPreview(null);
    }
  };

  const handleRetry = () => {
    if (lastFile) {
      performUpload(lastFile);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setPreview(null);
    setProgress(0);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileSelect}
        className="hidden"
      />

      {!preview && !uploading && (
        <button
          onClick={handleClick}
          className="w-full border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-8 hover:border-[#0CCE6B] dark:hover:border-[#0CCE6B] hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
        >
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <Icon className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                Max file size: {maxSize}MB
              </p>
            </div>
          </div>
        </button>
      )}

      {uploading && (
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
          <div className="flex items-center space-x-3 mb-3">
            <Icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            <span className="text-sm text-neutral-700 dark:text-neutral-300 flex-1">
              Uploading...
            </span>
            <span className="text-sm font-medium text-[#0CCE6B]">
              {progress}%
            </span>
          </div>
          <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#474747] to-[#0CCE6B] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {preview && !uploading && (
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <img
              src={preview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <CheckCircle className="w-5 h-5 text-[#0CCE6B]" />
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  Upload complete
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                File uploaded successfully
              </p>
            </div>
            <button
              onClick={handleRemove}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              aria-label="Remove"
            >
              <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start justify-between">
            <p className="text-sm text-red-600 dark:text-red-400 flex-1">{error}</p>
            {allowRetry && lastFile && (
              <button
                onClick={handleRetry}
                className="ml-3 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
