export interface PoobooImage {
  id: number;
  image_url: string;
  display_order: number;
  label: string;
}

export interface PoobooAccessory {
  id: number;
  accessory_type: 'baby-ornaments' | 'bands' | 'hair-clips';
  name: string;
  product_code: string;
  price: number;
  colour: string;
  stock: number;
  balance_stock: number;
  description: string;
  tags: string[];
  image_url: string | null;
  images?: PoobooImage[];
  is_active: boolean | number;
  created_at: string;
}