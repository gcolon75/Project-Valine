import apiClient from './api';

export const getFeedPosts = async (limit = 20, cursor = null) => {
  const { data } = await apiClient.get('/posts', { params: { limit, cursor } });
  return data;
};

export const createPost = async (postData) => {
  const { data } = await apiClient.post('/posts', postData);
  return data;
};
