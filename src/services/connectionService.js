import apiClient from './api';

export const getConnectionRequests = async (userId) => {
  const { data } = await apiClient.get('/connections/requests', { params: { userId } });
  return data;
};

export const sendConnectionRequest = async (requestData) => {
  const { data } = await apiClient.post('/connections/request', requestData);
  return data;
};

export const approveRequest = async (requestId) => {
  const { data } = await apiClient.post(`/connections/requests/${requestId}/approve`);
  return data;
};

export const rejectRequest = async (requestId) => {
  const { data } = await apiClient.post(`/connections/requests/${requestId}/reject`);
  return data;
};
