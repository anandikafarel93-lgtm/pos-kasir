export interface ProductCategoryRelation {
  id: string | number;
  name: string;
  slug?: string;
  icon?: string | null;
}

export interface ProductItem {
  id: string | number;
  category_id: string | number;
  sku?: string | null;
  name: string;
  points: number;
  description?: string | null;
  cost_price: number | string;
  price: number | string;
  stock: number;
  image_url?: string | null;
  kitchen_station?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  categories?: ProductCategoryRelation;
}

export interface ProductPayload {
  category_id: string | number;
  sku?: string;
  name: string;
  points: number;
  description?: string;
  cost_price?: number | string;
  price: number | string;
  stock?: number | string;
  kitchen_station?: string;
  is_active?: boolean;
  image_file?: File | null;
}

export interface ProductFilterParams {
  category_id?: string | number;
  search?: string;
  kitchen_station?: string;
  is_active?: boolean;
}