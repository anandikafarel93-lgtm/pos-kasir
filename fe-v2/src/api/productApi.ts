import axiosClient from './axiosClient';
import type { ProductItem, ProductPayload, ProductFilterParams } from '../types/product';

export const getProductsApi = async (filters?: ProductFilterParams): Promise<ProductItem[]> => {
  const response = await axiosClient.get('/products', { params: filters });
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data?.data || [];
};

export const getProductByIdApi = async (id: string | number): Promise<ProductItem> => {
  const response = await axiosClient.get(`/products/${id}`);
  return response.data?.data || response.data;
};

// Helper untuk membungkus field dan file upload ke multipart/form-data
const buildProductFormData = (payload: ProductPayload): FormData => {
  const formData = new FormData();
  formData.append('category_id', String(payload.category_id));
  formData.append('name', payload.name);
  formData.append('price', String(payload.price));
  formData.append('points', String(payload.points ?? 0));

  if (payload.sku) formData.append('sku', payload.sku);
  if (payload.description) formData.append('description', payload.description);
  if (payload.cost_price !== undefined && payload.cost_price !== '') {
    formData.append('cost_price', String(payload.cost_price));
  }
  if (payload.stock !== undefined && payload.stock !== '') {
    formData.append('stock', String(payload.stock));
  }
  if (payload.kitchen_station) formData.append('kitchen_station', payload.kitchen_station);
  if (payload.is_active !== undefined) formData.append('is_active', String(payload.is_active));

  // Kunci utama: nama key HARUS 'image_url' sesuai multer di productRoutes.ts
  if (payload.image_file) {
    formData.append('image_url', payload.image_file);
  }

  return formData;
};

export const createProductApi = async (payload: ProductPayload): Promise<ProductItem> => {
  const formData = buildProductFormData(payload);
  const response = await axiosClient.post('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data?.data || response.data;
};

export const updateProductApi = async (
  id: string | number,
  payload: ProductPayload
): Promise<ProductItem> => {
  const formData = buildProductFormData(payload);
  const response = await axiosClient.put(`/products/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data?.data || response.data;
};

export const deleteProductApi = async (id: string | number): Promise<void> => {
  await axiosClient.delete(`/products/${id}`);
};