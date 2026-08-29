import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BillData, ManualBillRequest } from '../core/models/bill.model';

@Injectable({ providedIn: 'root' })
export class BillService {
  private http = inject(HttpClient);
  private apiUrl = '/api/admin/bill';

  getBillForOrder(orderId: number): Observable<BillData> {
    return this.http.get<BillData>(`${this.apiUrl}/${orderId}`);
  }

  previewManualBill(request: ManualBillRequest): Observable<BillData> {
    return this.http.post<BillData>(`${this.apiUrl}/preview`, request);
  }

  downloadBill(orderId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/download/${orderId}`, {
      responseType: 'blob'
    });
  }
}