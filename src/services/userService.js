import apiClient from './api';

export const getUserProfile = async (username) => {
  const { data } = await apiClient.get(`/users/${username}`);
  return data;
};

export const updateUserProfile = async (userId, updates) => {
  const { data } = await apiClient.put(`/users/${userId}`, updates);
  return data;
};

export const createUser = async (userData) => {
  const { data } = await apiClient.post('/users', userData);
  return data;
};
