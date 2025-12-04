import apiClient from './api';

export const getFeedPosts = async (limit = 20, cursor = null) => {
  const { data } = await apiClient.get('/posts', { params: { limit, cursor } });
  return data;
};

export const createPost = async (postData) => {
  const { data } = await apiClient.post('/posts', postData);
  return data;
};

export const getPost = async (id) => {
  const { data } = await apiClient.get(`/posts/${id}`);
  return data;
};

export const likePost = async (id) => {
  const { data } = await apiClient.post(`/posts/${id}/like`);
  return data;
};

export const unlikePost = async (id) => {
  const { data } = await apiClient.delete(`/posts/${id}/like`);
  return data;
};

export const bookmarkPost = async (id) => {
  const { data } = await apiClient.post(`/posts/${id}/bookmark`);
  return data;
};

export const getPostComments = async (id, limit = 50, cursor = null) => {
  const { data } = await apiClient.get(`/posts/${id}/comments`, { params: { limit, cursor } });
  return data;
};

export const addPostComment = async (id, text) => {
  const { data } = await apiClient.post(`/posts/${id}/comments`, { text });
  return data;
};

/**
 * Get presigned URL for audio file upload
 * @param {string} filename - The original filename
 * @param {string} contentType - MIME type (audio/mpeg, audio/wav, etc.)
 * @returns {Promise<{uploadUrl: string, audioKey: string, audioUrl: string}>}
 */
export const getAudioUploadUrl = async (filename, contentType) => {
  const { data } = await apiClient.post('/posts/audio-upload-url', {
    filename,
    contentType
  });
  return data;
};

/**
 * Upload audio file to S3 using presigned URL
 * @param {string} uploadUrl - Presigned S3 URL
 * @param {File} file - Audio file to upload
 * @param {Function} onProgress - Progress callback (receives percentage 0-100)
 * @returns {Promise<void>}
 */
export const uploadAudioToS3 = (uploadUrl, file, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        if (onProgress) {
          onProgress(percentComplete);
        }
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'audio/mpeg');
    xhr.send(file);
  });
};

/**
 * Request access to a paid post
 * @param {string} postId - Post ID
 * @returns {Promise<{success: boolean, message: string, postId: string, price: number}>}
 */
export const requestPostAccess = async (postId) => {
  const { data } = await apiClient.post(`/posts/${postId}/request`);
  return data;
};

