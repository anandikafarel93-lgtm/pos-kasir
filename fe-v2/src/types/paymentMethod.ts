export interface PaymentMethodItem {
  id: string | number;
  name: string;
  code: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentMethodPayload {
  name: string;
  code: string;
  is_active?: boolean;
}