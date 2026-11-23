import type { OrderTypeEnum, OrderStatusEnum, KitchenStatusEnum } from './common';

export interface OrderItemProduct {
  id: string | number;
  sku?: string | null;
  name: string;
  image_url?: string | null;
  kitchen_station?: string | null;
}

export interface OrderItemDetail {
  id: string | number;
  order_id: string | number;
  product_id: string | number;
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
  notes?: string | null;
  kitchen_status: KitchenStatusEnum;
  products?: OrderItemProduct;
}

export interface OrderPaymentDetail {
  id: string | number;
  payment_method_id: string | number;
  amount_paid: number | string;
  change_amount?: number | string | null;
  payment_status: string;
  created_at: string;
  payment_methods?: {
    id: string | number;
    name: string;
    code: string;
  };
}

export interface OrderItem {
  id: string | number;
  order_number: string;
  user_id: string | number;
  table_id?: string | number | null;
  customer_name?: string | null;
  order_type: OrderTypeEnum;
  status: OrderStatusEnum;
  subtotal: number | string;
  discount_amount: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  created_at: string;
  updated_at?: string;
  users?: {
    id: string | number;
    name: string;
    username: string;
  };
  tables?: {
    id: string | number;
    table_number: string;
  } | null;
  order_items?: OrderItemDetail[];
  payments?: OrderPaymentDetail[];
}

export interface CreateOrderItemPayload {
  product_id: string | number;
  quantity: number;
  notes?: string;
}

export interface CreateOrderPayload {
  table_id?: string | number | null;
  customer_id?: string | number | null;
  customer_name?: string;
  order_type: OrderTypeEnum;
  discount_amount?: number;
  items: CreateOrderItemPayload[];
}

export interface OrderFilterParams {
  status?: OrderStatusEnum | '';
  order_type?: OrderTypeEnum | '';
  table_id?: string | number | '';
  date?: string;
}