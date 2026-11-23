// Enum Prisma
export type RoleCodeEnum = 'SUPERADMIN' | 'KASIR' | 'DAPUR' | 'PELAYAN';
export type KitchenStatusEnum = 'MENUNGGU' | 'DIMASAK' | 'SIAP_SAJI' | 'SELESAI';
export type OrderStatusEnum = 'PENDING' | 'DIPROSES' | 'SELESAI' | 'BATAL';
export type OrderTypeEnum = 'DINE_IN' | 'TAKE_AWAY';
export type PaymentStatusEnum = 'PENDING' | 'LUNAS' | 'GAGAL';
export type TableStatusEnum = 'TERSEDIA' | 'TERISI' | 'DIPESAN';

// Model Roles
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
}

// Model Users
export interface UserModel {
  id: string | number;
  role_id: string | number;
  name: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  is_active: boolean;
  last_login_at?: string | null;
  created_at?: string;
  roles?: RoleModel;
}

// Model Categories
export interface CategoryModel {
  id: string | number;
  name: string;
  slug: string;
  icon?: string | null;
  created_at?: string;
  _count?: {
    products: number;
  };
  products?: ProductModel[];
}

// Model Products
export interface ProductModel {
  id: string | number;
  category_id: string | number;
  sku?: string | null;
  name: string;
  description?: string | null;
  cost_price: number | string;
  price: number | string;
  stock: number;
  image_url?: string | null;
  kitchen_station?: string | null;
  is_active: boolean;
  created_at?: string;
  categories?: CategoryModel;
}

// Model Tables
export interface TableModel {
  id: string | number;
  table_number: string;
  capacity?: number;
  status: TableStatusEnum;
  created_at?: string;
}

// Model Payment Methods
export interface PaymentMethodModel {
  id: string | number;
  name: string;
  code: string;
  is_active: boolean;
  created_at?: string;
}

// Model Order Items
export interface OrderItemModel {
  id: string | number;
  order_id: string | number;
  product_id: string | number;
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
  notes?: string | null;
  kitchen_status: KitchenStatusEnum;
  products?: ProductModel;
}

// Model Orders
export interface OrderModel {
  id: string | number;
  order_number: string;
  user_id: string | number;
  table_id?: string | number | null;
  customer_name?: string | null;
  order_type: OrderTypeEnum;
  status: OrderStatusEnum;
  subtotal: number | string;
  tax_amount: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  created_at?: string;
  order_items?: OrderItemModel[];
  tables?: TableModel | null;
  users?: UserModel;
  payments?: PaymentModel | null;
}

// Model Payments
export interface PaymentModel {
  id: string | number;
  order_id: string | number;
  payment_method_id: string | number;
  amount_paid: number | string;
  change_amount: number | string;
  reference_number?: string | null;
  payment_status: PaymentStatusEnum;
  paid_at?: string;
  payment_methods?: PaymentMethodModel;
  orders?: OrderModel;
}