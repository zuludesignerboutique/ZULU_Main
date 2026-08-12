// src/app/core/models/product.model.ts

// A single gallery image for a product (multi-image support, max 4 per product).
export interface ProductImage {
  id: number;
  product_id?: number;
  image_url: string;
  display_order: number;
  label?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  images?: ProductImage[];
  category?: string;
  subcategory?: string;
  stock?: number;
  brand?: string;
  product_type?: string;
  product_code?: string;
  tag?: string;
  size?: string;
  colour?: string;
  qty?: number;
}

export interface CartItem extends Product {
  qty: number;
  size?: string;
  brand: string;
  product_type: string;
  product_code?: string;
}
