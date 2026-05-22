import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PoobooEnquiry } from '../core/models/pooboo-enquiry.model';

@Injectable({ providedIn: 'root' })
export class EnquiryService {

  private base = 'http://localhost:4000/api/pooboo/enquiries';

  constructor(private http: HttpClient) {}

  submit(enquiry: PoobooEnquiry): Observable<{ message: string; id: number }> {
    return this.http.post<{ message: string; id: number }>(this.base, enquiry);
  }

  // Admin
  getAll(status?: string): Observable<PoobooEnquiry[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<PoobooEnquiry[]>(this.base, { params });
  }

  getById(id: number): Observable<PoobooEnquiry> {
    return this.http.get<PoobooEnquiry>(`${this.base}/${id}`);
  }

  updateStatus(id: number, status: string, admin_notes?: string): Observable<any> {
    return this.http.patch(`${this.base}/${id}/status`, { status, admin_notes });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }
}