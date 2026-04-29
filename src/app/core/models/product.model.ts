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
}