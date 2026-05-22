export interface PoobooEnquiry {
  id?: number;
  parent_name: string;
  phone: string;
  email?: string;
  child_name?: string;
  child_age?: string;
  gender?: string;
  dress_type?: string;
  occasion?: string;
  preferred_color?: string;
  budget?: string;
  chest_cm?: number | null;
  waist_cm?: number | null;
  height_cm?: number | null;
  notes?: string;
  product_id?: number | null;
  status?: 'new' | 'contacted' | 'in_progress' | 'completed' | 'cancelled';
  admin_notes?: string;
  created_at?: string;
  updated_at?: string;
}