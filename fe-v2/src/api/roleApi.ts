import axiosClient from './axiosClient';
import type { RoleCodeEnum } from '../types/';

export interface UserInRole {
  id: string | number;
  name: string;
  username: string;
  email?: string | null;
  is_active: boolean;
}

export interface RoleItem {
  id: string | number;
  name: string;
  code: RoleCodeEnum;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  _count?: {
    users: number;
  };
  users?: UserInRole[];
}

export interface RolePayload {
  name: string;
  code: RoleCodeEnum;
  description?: string;
}

export const getRolesApi = async (): Promise<RoleItem[]> => {
  const response = await axiosClient.get('/roles');
  return response.data.data;
};

export const getRoleByIdApi = async (id: string | number): Promise<RoleItem> => {
  const response = await axiosClient.get(`/roles/${id}`);
  return response.data.data;
};

export const createRoleApi = async (payload: RolePayload): Promise<RoleItem> => {
  const response = await axiosClient.post('/roles', payload);
  return response.data.data;
};

export const updateRoleApi = async (id: string | number, payload: RolePayload): Promise<RoleItem> => {
  const response = await axiosClient.put(`/roles/${id}`, payload);
  return response.data.data;
};

export const deleteRoleApi = async (id: string | number): Promise<void> => {
  await axiosClient.delete(`/roles/${id}`);
};