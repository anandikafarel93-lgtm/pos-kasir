import axiosClient from './axiosClient';
import type { CategoryItem, CategoryPayload } from '../types/category';

export const getCategoriesApi = async (): Promise<CategoryItem[]> => {
  const response = await axiosClient.get('/categories');
  return response.data.data;
};

export const getCategoryByIdApi = async (id: string | number): Promise<CategoryItem> => {
  const response = await axiosClient.get(`/categories/${id}`);
  return response.data.data;
};

export const createCategoryApi = async (payload: CategoryPayload): Promise<CategoryItem> => {
  const response = await axiosClient.post('/categories', payload);
  return response.data.data;
};

export const updateCategoryApi = async (
  id: string | number,
  payload: CategoryPayload
): Promise<CategoryItem> => {
  const response = await axiosClient.put(`/categories/${id}`, payload);
  return response.data.data;
};

export const deleteCategoryApi = async (id: string | number): Promise<void> => {
  await axiosClient.delete(`/categories/${id}`);
};