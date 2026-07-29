import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Category {
  id: number;
  name: string;
}

export interface Subcategory {
  id: number;
  category_id: number;
  name: string;
}

// Shape returned by DELETE when the item is still in use by products (409 response)
export interface InUseProduct {
  name: string;
  product_code: string;
}

export interface DeleteBlockedResponse {
  inUse: true;
  products: InUseProduct[];
}

@Injectable({ providedIn: 'root' })
export class CategoryService {

  constructor(private http: HttpClient) {}

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/categories');
  }

  addCategory(name: string): Observable<Category> {
    return this.http.post<Category>('/api/categories', { name });
  }

  updateCategory(id: number, name: string): Observable<Category & { oldName: string }> {
    return this.http.put<Category & { oldName: string }>(`/api/categories/${id}`, { name });
  }

  deleteCategory(id: number, force = false): Observable<{ success: true }> {
    const url = `/api/categories/${id}${force ? '?force=true' : ''}`;
    return this.http.delete<{ success: true }>(url);
  }

  getSubcategories(categoryId?: number): Observable<Subcategory[]> {
    const url = categoryId
      ? `/api/subcategories?category_id=${categoryId}`
      : '/api/subcategories';
    return this.http.get<Subcategory[]>(url);
  }

  addSubcategory(categoryId: number, name: string): Observable<Subcategory> {
    return this.http.post<Subcategory>('/api/subcategories', {
      category_id: categoryId,
      name
    });
  }

  updateSubcategory(id: number, name: string): Observable<Subcategory & { oldName: string }> {
    return this.http.put<Subcategory & { oldName: string }>(`/api/subcategories/${id}`, { name });
  }

  deleteSubcategory(id: number, force = false): Observable<{ success: true }> {
    const url = `/api/subcategories/${id}${force ? '?force=true' : ''}`;
    return this.http.delete<{ success: true }>(url);
  }
}