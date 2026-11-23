import axiosClient from './axiosClient';
import type { UserItem, UserPayload } from '../types/user';

export const getUsersApi = async (): Promise<UserItem[]> => {
  const response = await axiosClient.get('/users');
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data?.data || [];
};

export const getUserByIdApi = async (id: string | number): Promise<UserItem> => {
  const response = await axiosClient.get(`/users/${id}`);
  return response.data?.data || response.data;
};

export const createUserApi = async (payload: UserPayload): Promise<UserItem> => {
  const response = await axiosClient.post('/users', payload);
  return response.data?.data || response.data;
};

export const updateUserApi = async (
  id: string | number,
  payload: UserPayload
): Promise<UserItem> => {
  const response = await axiosClient.put(`/users/${id}`, payload);
  return response.data?.data || response.data;
};

export const deleteUserApi = async (id: string | number): Promise<void> => {
  await axiosClient.delete(`/users/${id}`);
};