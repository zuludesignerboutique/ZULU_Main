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
  is_active: boolean | number;
  created_at: string;
}