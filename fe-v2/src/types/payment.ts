import type { PaymentMethodItem } from './paymentMethod';
import type { OrderItem } from './order';

export interface PaymentItem {
  id: string | number;
  order_id: string | number;
  payment_method_id: string | number;
  amount_paid: number | string;
  change_amount?: number | string | null;
  reference_number?: string | null;
  payment_status: 'LUNAS' | 'PENDING' | 'BATAL';
  paid_at: string;
  created_at?: string;
  updated_at?: string;
  payment_methods?: PaymentMethodItem;
  orders?: {
    id?: string | number;
    order_number: string;
    customer_name: string;
    total_amount: number | string;
    order_type: string;
    users?: {
      name: string;
    };
  } & Partial<OrderItem>;
}

export interface ProcessPaymentPayload {
  order_id: string | number;
  payment_method_id: string | number;
  amount_paid: number;
  reference_number?: string;
}

export interface UpdatePaymentPayload {
  payment_method_id?: string | number;
  amount_paid?: number;
  reference_number?: string;
  payment_status?: 'LUNAS' | 'PENDING' | 'BATAL';
}

export interface PaymentFilterParams {
  payment_method_id?: string | number;
  date?: string;
}