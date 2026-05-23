export interface PoobooReview {
  id: number;
  productId?: number;       // null = general brand review
  productName?: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  rating: number;           // 1–5
  title: string;
  body: string;
  photoUrl?: string;        // uploaded photo (optional)
  brand: string;            // 'pooboo'
  createdAt: string;        // ISO date string
  isVisible: boolean;       // admin can set false to hide/delete
}

export interface PoobooReviewPayload {
  productId?: number;
  rating: number;
  title: string;
  body: string;
  photo?: File;
}