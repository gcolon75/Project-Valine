// src/components/AvatarUploader.jsx
import { useState, useRef } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * AvatarUploader Component
 * Enhanced image uploader with validation and processing
 * 
 * Features:
 * - File type validation (JPEG, PNG, WebP)
 * - File size validation (max 5MB)
 * - Aspect ratio enforcement (square for avatars)
 * - Client-side image resizing
 * - EXIF metadata stripping for privacy
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const TARGET_SIZE = 800; // Target dimension for resized image

export default function AvatarUploader({ 
  onUpload, 
  onCancel, 
  currentAvatar = null,
  title = "Upload Avatar"
}) {
  const [preview, setPreview] = useState(currentAvatar);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  /**
   * Validate file before processing
   */
  const validateFile = (file) => {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
      return false;
    }

    return true;
  };

  /**
   * Process and resize image
   */
  const processImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          try {
            // Create canvas for processing
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Calculate dimensions (maintain aspect ratio, crop to square)
            const size = Math.min(img.width, img.height);
            const targetSize = Math.min(size, TARGET_SIZE);

            canvas.width = targetSize;
            canvas.height = targetSize;

            // Calculate crop position (center crop)
            const sx = (img.width - size) / 2;
            const sy = (img.height - size) / 2;

            // Draw and resize image
            ctx.drawImage(
              img,
              sx, sy, size, size,  // Source rectangle
              0, 0, targetSize, targetSize  // Destination rectangle
            );

            // Convert to blob (strips EXIF metadata)
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error('Failed to process image'));
                }
              },
              'image/jpeg',
              0.9  // Quality
            );
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!validateFile(file)) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Process image
      const processedBlob = await processImage(file);

      // Create preview URL
      const previewUrl = URL.createObjectURL(processedBlob);
      setPreview(previewUrl);

      // Call onUpload with processed blob
      if (onUpload) {
        await onUpload(processedBlob, file.type);
      }

      toast.success('Avatar uploaded successfully!');
    } catch (err) {
      console.error('Failed to process image:', err);
      setError('Failed to process image. Please try another file.');
      toast.error('Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Clear preview and reset
   */
  const handleClear = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            aria-label="Close"
            disabled={isProcessing}
          >
            <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Preview or Upload Area */}
          {preview ? (
            <div className="space-y-4">
              <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                <img
                  src={preview}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleClear}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors disabled:opacity-50"
                >
                  Change Image
                </button>
                <button
                  onClick={onCancel}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-[#474747] to-[#0CCE6B] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                onChange={handleFileSelect}
                disabled={isProcessing}
                className="hidden"
                aria-label="Choose image file"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full p-8 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg hover:border-[#0CCE6B] hover:bg-[#0CCE6B]/5 transition-colors disabled:opacity-50"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-neutral-400 dark:text-neutral-600" />
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {isProcessing ? 'Processing...' : 'Click to upload image'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-600">
                  JPEG, PNG, or WebP • Max 5MB
                </p>
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-300">
                {error}
              </p>
            </div>
          )}

          {/* Info */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              <strong>Tips:</strong> Use a square image (1:1 aspect ratio) for best results.
              Images will be automatically cropped and resized to 800x800px.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
