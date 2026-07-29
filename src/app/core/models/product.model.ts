// src/app/core/models/product.model.ts
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category?: string;
  subcategory?: string;
  stock?: number;
  brand?: string;
  product_type?: string;
  product_code?: string;
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