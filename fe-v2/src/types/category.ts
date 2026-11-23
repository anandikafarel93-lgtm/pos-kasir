export interface CategoryProductPreview {
  id: string | number;
  sku?: string | null;
  name: string;
  price: number | string;
  stock: number;
  image_url?: string | null;
  kitchen_station?: string | null;
}

export interface CategoryItem {
  id: string | number;
  name: string;
  slug: string;
  icon?: string | null;
  created_at?: string;
  updated_at?: string;
  _count?: {
    products: number;
  };
  products?: CategoryProductPreview[];
}

export interface CategoryPayload {
  name: string;
  icon?: string;
}