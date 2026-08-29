import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompanySettings } from '../core/models/bill.model';

@Injectable({ providedIn: 'root' })
export class CompanySettingsService {
  private http = inject(HttpClient);
  private apiUrl = '/api/admin/company-settings';

  getSettings(): Observable<CompanySettings> {
    return this.http.get<CompanySettings>(this.apiUrl);
  }

  updateSettings(settings: Partial<CompanySettings>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(this.apiUrl, settings);
  }
}