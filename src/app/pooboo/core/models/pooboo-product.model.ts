export interface PoobooProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  age_group: string;
  gender: 'boys' | 'girls' | 'unisex';
  sizes: string[];
  colours: string[];
  image_url: string;
  stock: number;
  product_code: string;
  details: string[];
  tags: string[];
  is_customizable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}