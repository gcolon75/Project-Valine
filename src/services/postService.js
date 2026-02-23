import { apiClient } from './api.js';

export const getFeedPosts = async (limit = 20, cursor = null) => {
  const { data } = await apiClient.get('/feed', { params: { limit, cursor } });
  return data?.posts ?? data;
};

/**
 * List posts with optional filtering
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of posts to return
 * @param {string} options.cursor - Pagination cursor
 * @param {string} options.authorId - Filter by author user ID
 * @returns {Promise<Array>} Array of posts
 */
export const listPosts = async ({ limit = 20, cursor = null, authorId = null } = {}) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  if (authorId) params.authorId = authorId;
  
  const { data } = await apiClient.get('/posts', { params });
  return data?.posts ?? data;
};

export const createPost = async (postData) => {
  const { data } = await apiClient.post('/posts', postData);
  return data;
};

export const getPost = async (id) => {
  const { data } = await apiClient.get(`/posts/${id}`);
  return data;
};

export const deletePost = async (id) => {
  const { data } = await apiClient.delete(`/posts/${id}`);
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

export const addPostComment = async (id, text, parentId = null) => {
  const { data } = await apiClient.post(`/posts/${id}/comments`, { text, parentId });
  return data;
};

export const updateComment = async (commentId, text) => {
  const { data } = await apiClient.put(`/comments/${commentId}`, { text });
  return data;
};

export const deleteComment = async (commentId) => {
  const { data } = await apiClient.delete(`/comments/${commentId}`);
  return data;
};

export const getCommentReplies = async (commentId, limit = 20, cursor = null) => {
  const { data } = await apiClient.get(`/comments/${commentId}/replies`, { params: { limit, cursor } });
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
 * @param {string} message - Optional message to post owner
 * @returns {Promise<{success: boolean, message: string, postId: string, price: number}>}
 */
export const requestPostAccess = async (postId, message = null) => {
  const { data } = await apiClient.post(`/posts/${postId}/request`, { message });
  return data;
};

/**
 * Grant or deny access to a post
 * @param {string} postId - Post ID
 * @param {string} requestId - Access request ID
 * @param {string} action - 'approve' or 'deny'
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const grantPostAccess = async (postId, requestId, action) => {
  const { data } = await apiClient.post(`/posts/${postId}/grant`, { requestId, action });
  return data;
};

/**
 * Pay for access to a post
 * @param {string} postId - Post ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const payForPostAccess = async (postId) => {
  const { data } = await apiClient.post(`/posts/${postId}/pay`);
  return data;
};

/**
 * Get access requests for user's posts
 * @param {string} userId - User ID
 * @param {string} status - Filter by status (PENDING, APPROVED, DENIED)
 * @returns {Promise<Array>}
 */
export const getUserAccessRequests = async (userId, status = 'PENDING') => {
  const { data } = await apiClient.get(`/users/${userId}/requests`, { params: { status } });
  return data?.requests ?? [];
};
