export interface PoobooImage {
  id: number;
  image_url: string;
  display_order: number;
  label: string;
}

export interface PoobooFabric {
  id: number;
  name: string;
  product_code: string;
  fabric_type: string;       // cotton | silk | linen | georgette | net | velvet
  price_per_meter: number;
  colour: string;
  total_meters: number;
  balance_stock: number;
  description: string;
  tags: string[];
  image_url: string | null;
  images?: PoobooImage[];
  is_active: boolean | number;
  created_at: string;
}