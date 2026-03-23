export interface Product {

  id: number;
  name: string;
  price: number;

  // Support both backend and frontend
  image?: string;
  image_url?: string;

  description?: string;
  category?: string;

  created_at?: string;
  createdAt?: Date;

}