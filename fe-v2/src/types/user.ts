import type { RoleModel } from './role';

export interface UserItem {
  id: string | number;
  role_id: string | number;
  name: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  pin_code?: string | null;
  is_active: boolean;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
  roles?: RoleModel | null;
}

export interface UserPayload {
  role_id: string | number;
  name: string;
  username?: string;
  email?: string;
  password?: string;
  pin_code?: string;
  phone?: string;
  is_active?: boolean;
}