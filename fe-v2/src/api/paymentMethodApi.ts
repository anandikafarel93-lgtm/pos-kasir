import axiosClient from './axiosClient';
import type { PaymentMethodItem, PaymentMethodPayload } from '../types/paymentMethod';

export const getPaymentMethodsApi = async (isActive?: boolean): Promise<PaymentMethodItem[]> => {
  const params = isActive !== undefined ? { is_active: isActive } : {};
  const response = await axiosClient.get('/payment-methods', { params });
  return response.data.data;
};

export const getPaymentMethodByIdApi = async (id: string | number): Promise<PaymentMethodItem> => {
  const response = await axiosClient.get(`/payment-methods/${id}`);
  return response.data.data;
};

export const createPaymentMethodApi = async (
  payload: PaymentMethodPayload
): Promise<PaymentMethodItem> => {
  const response = await axiosClient.post('/payment-methods', payload);
  return response.data.data;
};

export const updatePaymentMethodApi = async (
  id: string | number,
  payload: PaymentMethodPayload
): Promise<PaymentMethodItem> => {
  const response = await axiosClient.put(`/payment-methods/${id}`, payload);
  return response.data.data;
};

export const patchPaymentMethodApi = async (
  id: string | number,
  payload: Partial<PaymentMethodPayload>
): Promise<PaymentMethodItem> => {
  const response = await axiosClient.patch(`/payment-methods/${id}`, payload);
  return response.data.data;
};

export const deletePaymentMethodApi = async (id: string | number): Promise<void> => {
  await axiosClient.delete(`/payment-methods/${id}`);
};