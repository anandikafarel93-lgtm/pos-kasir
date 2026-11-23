import axiosClient from './axiosClient';
import type { TableItem, TablePayload } from '../types/table';
import type { TableStatusEnum } from '../types/common';

export const getTablesApi = async (statusFilter?: TableStatusEnum | ''): Promise<TableItem[]> => {
  const params = statusFilter ? { status: statusFilter } : {};
  const response = await axiosClient.get('/tables', { params });
  console.log('Respon API Tables:', response.data);
  return response.data.data;
};

export const getTableByIdApi = async (id: string | number): Promise<TableItem> => {
  const response = await axiosClient.get(`/tables/${id}`);
  return response.data.data;
};

export const createTableApi = async (payload: TablePayload): Promise<TableItem> => {
  const response = await axiosClient.post('/tables', payload);
  return response.data.data;
};

export const updateTableApi = async (id: string | number, payload: TablePayload): Promise<TableItem> => {
  const response = await axiosClient.put(`/tables/${id}`, payload);
  return response.data.data;
};

export const patchTableApi = async (
  id: string | number,
  payload: Partial<TablePayload>
): Promise<TableItem> => {
  const response = await axiosClient.patch(`/tables/${id}`, payload);
  return response.data.data;
};

export const deleteTableApi = async (id: string | number): Promise<void> => {
  await axiosClient.delete(`/tables/${id}`);
};