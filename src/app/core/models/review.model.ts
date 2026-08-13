export interface Review {
  id: number;
  productId?: number | null;
  productName?: string | null;
  customerId: number;
  customerName: string;
  customerEmail: string;
  rating: number;
  title: string;
  body: string;
  photoUrl?: string | null;
  brand: string;
  isVisible?: boolean;
  createdAt: string | Date;
}