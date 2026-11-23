import axiosClient from './axiosClient';
import type {
  PaymentItem,
  ProcessPaymentPayload,
  UpdatePaymentPayload,
  PaymentFilterParams,
} from '../types/payment';

export const getPaymentsApi = async (filters?: PaymentFilterParams): Promise<PaymentItem[]> => {
  const response = await axiosClient.get('/payments', { params: filters });
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data?.data || [];
};

export const getPaymentReceiptByOrderIdApi = async (
  orderId: string | number
): Promise<PaymentItem> => {
  const response = await axiosClient.get(`/payments/order/${orderId}`);
  return response.data?.data || response.data;
};

export const processPaymentApi = async (
  payload: ProcessPaymentPayload & {
    discount_amount?: number;
    tax_amount?: number;
    total_amount?: number;
  }
): Promise<{ payment: PaymentItem; order: any }> => {
  const response = await axiosClient.post('/payments', payload);
  return response.data?.data || response.data;
};

export const updatePaymentApi = async (
  id: string | number,
  payload: UpdatePaymentPayload
): Promise<PaymentItem> => {
  const response = await axiosClient.put(`/payments/${id}`, payload);
  return response.data?.data || response.data;
};

export const deletePaymentApi = async (id: string | number): Promise<void> => {
  await axiosClient.delete(`/payments/${id}`);
};

export const createMidtransTokenApi = async (payload: {
  order_ids: (string | number)[];
  payment_method_id: string | number;
  discount_amount?: number;
  total_amount?: number;
}) => {
  const response = await axiosClient.post('/payments/midtrans/token', payload);
  return response.data.data; 
};