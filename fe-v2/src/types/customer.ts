export interface CustomerItem {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  member_tier: 'REGULER' | 'SILVER' | 'GOLD' | 'VIP' | string;
  points: number;
  total_spent: string | number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}