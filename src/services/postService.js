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
