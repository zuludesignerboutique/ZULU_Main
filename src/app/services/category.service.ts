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

  private api = 'http://localhost:4000';

  constructor(private http: HttpClient) {}

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.api}/api/categories`);
  }

  addCategory(name: string): Observable<Category> {
    return this.http.post<Category>(`${this.api}/api/categories`, { name });
  }

  // Rename a category. Backend cascades the new name onto any products using it.
  updateCategory(id: number, name: string): Observable<Category & { oldName: string }> {
    return this.http.put<Category & { oldName: string }>(`${this.api}/api/categories/${id}`, { name });
  }

  // Delete a category. Pass force=true only after the user has confirmed past an "in use" warning.
  deleteCategory(id: number, force = false): Observable<{ success: true }> {
    const url = force
      ? `${this.api}/api/categories/${id}?force=true`
      : `${this.api}/api/categories/${id}`;
    return this.http.delete<{ success: true }>(url);
  }

  getSubcategories(categoryId?: number): Observable<Subcategory[]> {
    const url = categoryId
      ? `${this.api}/api/subcategories?category_id=${categoryId}`
      : `${this.api}/api/subcategories`;
    return this.http.get<Subcategory[]>(url);
  }

  addSubcategory(categoryId: number, name: string): Observable<Subcategory> {
    return this.http.post<Subcategory>(`${this.api}/api/subcategories`, {
      category_id: categoryId,
      name
    });
  }

  // Rename a subcategory. Backend cascades the new name onto any products using it.
  updateSubcategory(id: number, name: string): Observable<Subcategory & { oldName: string }> {
    return this.http.put<Subcategory & { oldName: string }>(`${this.api}/api/subcategories/${id}`, { name });
  }

  // Delete a subcategory. Pass force=true only after the user has confirmed past an "in use" warning.
  deleteSubcategory(id: number, force = false): Observable<{ success: true }> {
    const url = force
      ? `${this.api}/api/subcategories/${id}?force=true`
      : `${this.api}/api/subcategories/${id}`;
    return this.http.delete<{ success: true }>(url);
  }
}