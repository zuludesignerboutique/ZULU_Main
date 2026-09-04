import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CategoryLandingImage {
  id: number;
  category_id: number;
  image_url: string;
  display_order: number;
}

export interface CategoryLandingCard {
  id: number;
  category_slug: string;
  title: string;
  subtitle: string;
  button_text: string;
  button_link: string;
  display_order: number;
  is_active: number;
  images: CategoryLandingImage[];
}

@Injectable({ providedIn: 'root' })
export class CategoryLandingService {
  private api = '/api';

  constructor(private http: HttpClient) {}

  getPublicCards(): Observable<{ cards: CategoryLandingCard[] }> {
    return this.http.get<{ cards: CategoryLandingCard[] }>(`${this.api}/category-landing`);
  }

  getAdminCards(): Observable<{ cards: CategoryLandingCard[] }> {
    return this.http.get<{ cards: CategoryLandingCard[] }>(`${this.api}/admin/category-landing`);
  }

  updateCard(slug: string, data: Partial<CategoryLandingCard>): Observable<any> {
    return this.http.put(`${this.api}/admin/category-landing/cards/${slug}`, data);
  }

  uploadImages(slug: string, files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));
    return this.http.post(`${this.api}/admin/category-landing/cards/${slug}/images`, formData);
  }

  deleteImage(slug: string, imageId: number): Observable<any> {
    return this.http.delete(`${this.api}/admin/category-landing/cards/${slug}/images/${imageId}`);
  }

  reorderImages(slug: string, orderedIds: number[]): Observable<any> {
    return this.http.post(`${this.api}/admin/category-landing/cards/${slug}/images/reorder`, { orderedIds });
  }
}
