import type { TableStatusEnum, OrderStatusEnum } from './common';

export interface TableActiveOrder {
  id: string | number;
  order_number: string;
  customer_name?: string | null;
  status: OrderStatusEnum;
  total_amount: number | string;
  created_at: string;
}

export interface TableItem {
  id: string | number;
  table_number: string;
  capacity?: number | null;
  status: TableStatusEnum;
  created_at?: string;
  updated_at?: string;
  orders?: TableActiveOrder[];
}

export interface TablePayload {
  table_number: string;
  capacity?: number;
  status?: TableStatusEnum;
}