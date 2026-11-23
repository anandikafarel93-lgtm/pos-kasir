import axiosClient from './axiosClient';
import type { CustomerItem } from '../types/customer';

export const getCustomersApi = async (search = ''): Promise<CustomerItem[]> => {
  const response = await axiosClient.get('/customers', {
    params: search ? { search } : {},
  });
  return Array.isArray(response.data) ? response.data : response.data?.data || [];
};

export const createCustomerApi = async (payload: Partial<CustomerItem>) => {
  const response = await axiosClient.post('/customers', payload);
  return response.data;
};

export const updateCustomerApi = async (id: string, payload: Partial<CustomerItem>) => {
  const response = await axiosClient.put(`/customers/${id}`, payload);
  return response.data;
};

export const deleteCustomerApi = async (id: string) => {
  const response = await axiosClient.delete(`/customers/${id}`);
  return response.data;
};