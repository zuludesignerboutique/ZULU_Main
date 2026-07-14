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
}