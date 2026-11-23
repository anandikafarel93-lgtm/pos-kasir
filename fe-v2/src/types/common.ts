// Enum Prisma
export type RoleCodeEnum = 'SUPERADMIN' | 'KASIR' | 'DAPUR' | 'PELAYAN';
export type KitchenStatusEnum = 'MENUNGGU' | 'DIMASAK' | 'SIAP_SAJI' | 'SELESAI';
export type OrderStatusEnum = 'PENDING' | 'DIPROSES' | 'SELESAI' | 'BATAL';
export type OrderTypeEnum = 'DINE_IN' | 'TAKE_AWAY';
export type PaymentStatusEnum = 'PENDING' | 'LUNAS' | 'GAGAL';
export type TableStatusEnum = 'TERSEDIA' | 'TERISI' | 'DIPESAN';

// Standar Respons API Backend
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}