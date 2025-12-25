// Media service - API client for media uploads and management
import { apiClient } from './api.js';

/**
 * Get MIME type for a file based on its type
 * @param {File} file - File object
 * @param {string} mediaType - Media type (image, video, pdf)
 * @returns {string} MIME type
 */
export const getContentType = (file, mediaType) => {
  // Use file's MIME type if available
  if (file.type) {
    return file.type;
  }

  // Fallback based on media type
  const contentTypeMap = {
    image: 'image/jpeg',
    video: 'video/mp4',
    pdf: 'application/pdf',
  };

  return contentTypeMap[mediaType] || 'application/octet-stream';
};

/**
 * Get signed S3 upload URL and create placeholder media record
 * @param {string} profileId - Profile ID
 * @param {string} type - Media type (image, video, pdf)
 * @param {string} title - Media title (optional)
 * @param {string} description - Media description (optional)
 * @param {string} privacy - Privacy setting (public, on-request, private)
 * @returns {Promise<Object>} Upload URL data with mediaId, uploadUrl, s3Key
 */
export const getUploadUrl = async (profileId, type, title = null, description = null, privacy = 'public') => {
  if (!profileId) {
    throw new Error('Profile ID is required');
  }

  if (!type || !['image', 'video', 'pdf'].includes(type)) {
    throw new Error('Valid type is required (image, video, or pdf)');
  }

  try {
    const { data } = await apiClient.post(`/profiles/${profileId}/media/upload-url`, {
      type,
      title,
      description,
      privacy,
    });

    return data;
  } catch (error) {
    console.error('Failed to get upload URL:', error);
    
    // Provide helpful error messages
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to upload to this profile');
    } else if (error.response?.status === 404) {
      throw new Error('Profile not found');
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error('Failed to get upload URL. Please try again.');
  }
};

/**
 * Upload file to S3 using presigned URL with progress tracking
 * @param {string} presignedUrl - S3 presigned URL
 * @param {File} file - File to upload
 * @param {string} mediaType - Media type (image, video, pdf)
 * @param {Function} onProgress - Progress callback (receives percentage 0-100)
 * @returns {Promise<void>}
 */
export const uploadToS3 = (presignedUrl, file, mediaType, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        // Defensive guard: only call onProgress if it's a function
        if (typeof onProgress === 'function') {
          onProgress(percentComplete);
        }
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload. Please check your connection and try again.'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was cancelled'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timed out. Please try again.'));
    });

    // Configure request
    xhr.open('PUT', presignedUrl, true);
    
    // Set Content-Type based on file and media type
    const contentType = getContentType(file, mediaType);
    xhr.setRequestHeader('Content-Type', contentType);
    
    // Set timeout (10 minutes for large files)
    xhr.timeout = 600000;

    // Send the file
    xhr.send(file);
  });
};

/**
 * Mark upload as complete and trigger processing
 * @param {string} profileId - Profile ID
 * @param {string} mediaId - Media ID from getUploadUrl response
 * @param {Object} metadata - Optional metadata (width, height, fileSize)
 * @returns {Promise<Object>} Updated media record
 */
export const completeUpload = async (profileId, mediaId, metadata = {}) => {
  if (!profileId) {
    throw new Error('Profile ID is required');
  }

  if (!mediaId) {
    throw new Error('Media ID is required');
  }

  try {
    const { data } = await apiClient.post(`/profiles/${profileId}/media/complete`, {
      mediaId,
      ...metadata,
    });

    return data;
  } catch (error) {
    console.error('Failed to complete upload:', error);
    
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to complete this upload');
    } else if (error.response?.status === 404) {
      throw new Error('Media record not found');
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error('Failed to complete upload. Please try again.');
  }
};

/**
 * Update media metadata
 * @param {string} mediaId - Media ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated media record
 */
export const updateMedia = async (mediaId, updates) => {
  if (!mediaId) {
    throw new Error('Media ID is required');
  }

  try {
    const { data } = await apiClient.put(`/media/${mediaId}`, updates);
    return data;
  } catch (error) {
    console.error('Failed to update media:', error);
    
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to update this media');
    } else if (error.response?.status === 404) {
      throw new Error('Media not found');
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error('Failed to update media. Please try again.');
  }
};

/**
 * Delete media
 * @param {string} mediaId - Media ID
 * @returns {Promise<void>}
 */
export const deleteMedia = async (mediaId) => {
  if (!mediaId) {
    throw new Error('Media ID is required');
  }

  try {
    await apiClient.delete(`/media/${mediaId}`);
  } catch (error) {
    console.error('Failed to delete media:', error);
    
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to delete this media');
    } else if (error.response?.status === 404) {
      throw new Error('Media not found');
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error('Failed to delete media. Please try again.');
  }
};

/**
 * Full upload flow: get URL, upload to S3, mark complete
 * @param {string} profileId - Profile ID
 * @param {File} file - File to upload
 * @param {string} type - Media type (image, video, pdf)
 * @param {Object} options - Upload options
 * @param {string} options.title - Media title
 * @param {string} options.description - Media description
 * @param {string} options.privacy - Privacy setting
 * @param {Function} options.onProgress - Progress callback
 * @returns {Promise<Object>} Completed media record
 */
export const uploadMedia = async (profileId, file, type, options = {}) => {
  const { title, description, privacy = 'public', onProgress } = options;

  // Validate file input
  if (!file) {
    throw new Error('File is required');
  }
  
  if (!(file instanceof Blob) && !(file instanceof File)) {
    throw new Error('Invalid file input: expected Blob or File object');
  }

  // Validate file size (500MB max for videos, 10MB for images)
  const maxSize = type === 'video' ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    const maxSizeMB = type === 'video' ? 500 : 10;
    throw new Error(`File size must be less than ${maxSizeMB}MB`);
  }

  try {
    // Step 1: Get presigned upload URL
    // Defensive guard: only call onProgress if it's actually a function
    if (typeof onProgress === 'function') {
      onProgress(0);
    }
    const { mediaId, uploadUrl } = await getUploadUrl(profileId, type, title, description, privacy);

    // Step 2: Upload to S3 with progress tracking
    await uploadToS3(uploadUrl, file, type, (progress) => {
      // Scale progress to 10-90% range (reserve 0-10% for getting URL, 90-100% for completion)
      if (typeof onProgress === 'function') {
        onProgress(10 + Math.floor(progress * 0.8));
      }
    });

    // Step 3: Mark upload as complete
    if (typeof onProgress === 'function') {
      onProgress(95);
    }
    
    // Get image dimensions if it's an image
    let metadata = { fileSize: file.size };
    if (type === 'image' && file.type.startsWith('image/')) {
      try {
        const dimensions = await getImageDimensions(file);
        metadata = { ...metadata, ...dimensions };
      } catch (err) {
        console.warn('Failed to get image dimensions:', err);
      }
    }

    const result = await completeUpload(profileId, mediaId, metadata);
    if (typeof onProgress === 'function') {
      onProgress(100);
    }

    return result;
  } catch (error) {
    console.error('Media upload failed:', error);
    throw error;
  }
};

/**
 * Get image dimensions from file
 * @param {File} file - Image file
 * @returns {Promise<Object>} Width and height
 */
const getImageDimensions = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
};

/**
 * Get presigned download URL for media
 * @param {string} mediaId - Media ID
 * @param {string} requesterId - User requesting access (optional)
 * @returns {Promise<Object>} Download URL data with downloadUrl, expiresAt, filename
 */
export const getMediaAccessUrl = async (mediaId, requesterId) => {
  if (!mediaId) {
    throw new Error('Media ID is required');
  }

  try {
    const params = requesterId ? { requesterId } : {};
    const { data } = await apiClient.get(`/media/${mediaId}/access-url`, { params });
    return data;
  } catch (error) {
    console.error('Failed to get media access URL:', error);
    
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to access this media');
    } else if (error.response?.status === 404) {
      throw new Error('Media not found');
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error('Failed to get download URL. Please try again.');
  }
};

/**
 * Request access to gated media
 * @param {string} mediaId - Media ID
 * @param {string} requesterId - User requesting access
 * @param {string} reason - Optional reason for request
 * @returns {Promise<Object>} Request status
 */
export const requestMediaAccess = async (mediaId, requesterId, reason = '') => {
  if (!mediaId) {
    throw new Error('Media ID is required');
  }

  if (!requesterId) {
    throw new Error('Requester ID is required');
  }

  try {
    const { data } = await apiClient.post(`/media/${mediaId}/request-access`, {
      requesterId,
      reason
    });
    return data;
  } catch (error) {
    console.error('Failed to request media access:', error);
    
    if (error.response?.status === 403) {
      throw new Error('You cannot request access to this media');
    } else if (error.response?.status === 404) {
      throw new Error('Media not found');
    } else if (error.response?.status === 409) {
      throw new Error('Access request already pending');
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error('Failed to request access. Please try again.');
  }
};
