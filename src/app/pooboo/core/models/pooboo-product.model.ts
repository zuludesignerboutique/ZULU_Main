export interface PoobooImage {
  id: number;
  image_url: string;
  display_order: number;
  label: string;
}

export interface PoobooProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  age_group: string; // legacy single — kept for ZULU compat / backward compat
  age_groups: string[];
  gender: 'boys' | 'girls' | 'unisex';
  sizes: string[];
  colours: string[];
  image_url: string;
  images?: PoobooImage[];
  stock: number;
  product_code: string;
  details: string[];
  tags: string[];
  is_customizable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}