import axiosClient from './axiosClient';
import type {
  OrderItem,
  CreateOrderPayload,
  OrderFilterParams,
} from '../types/order';
import type { OrderStatusEnum } from '../types/common';

export const getOrdersApi = async (filters?: OrderFilterParams): Promise<OrderItem[]> => {
  const response = await axiosClient.get('/orders', { params: filters });
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data?.data || [];
};

export const getOrderByIdApi = async (id: string | number): Promise<OrderItem> => {
  const response = await axiosClient.get(`/orders/${id}`);
  return response.data?.data || response.data;
};

export const createOrderApi = async (payload: CreateOrderPayload): Promise<OrderItem> => {
  const response = await axiosClient.post('/orders', payload);
  return response.data?.data || response.data;
};

export const updateOrderStatusApi = async (
  id: string | number,
  status: OrderStatusEnum
): Promise<OrderItem> => {
  const response = await axiosClient.patch(`/orders/${id}/status`, { status });
  return response.data?.data || response.data;
};

export const updateOrderDiscountApi = async (
  orderId: string | number,
  payload: { discount_amount: number; tax_amount?: number; total_amount?: number }
) => {
  const response = await axiosClient.put(`/orders/${orderId}`, payload);
  return response.data?.data || response.data;
};