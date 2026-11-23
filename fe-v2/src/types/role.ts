import type { RoleCodeEnum } from './common';

export interface UserInRole {
  id: string | number;
  name: string;
  username: string;
  email?: string | null;
  is_active: boolean;
}

export interface RoleModel {
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