import axiosClient from './axiosClient';

// Pilihan role sesuai enum di skema Prisma
export type RoleCodeEnum = 'SUPERADMIN' | 'KASIR' | 'DAPUR' | 'PELAYAN';

export interface LoginPayload {
  username?: string;
  email?: string;
  password?: string;
}

// Menyesuaikan struktur JSON user dari respons login API
export interface AuthUser {
  id: string | number;
  name: string;
  username: string;
  role: RoleCodeEnum | string;
  email?: string | null;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: AuthUser;
  };
}

export const loginApi = async (payload: LoginPayload): Promise<LoginResponse['data']> => {
  const response = await axiosClient.post<LoginResponse>('/auth/login', payload);
  return response.data.data;
};

export const googleLoginApi = async (credential: string) => {
  const response = await axiosClient.post('/auth/google', { credential });
  return response.data.data; 
};