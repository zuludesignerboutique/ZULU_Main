import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Subscriber {
  id: number;
  name: string;
  email: string;
  user_id: number | null;
  is_active: number;
  subscribed_at: string;
  unsubscribed_at: string | null;
  created_at: string;
  user_name: string | null;
  user_phone: string | null;
}

export interface SubscribersResponse {
  subscribers: Subscriber[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface StatsResponse {
  total_users: number;
  subscribers: number;
  unsubscribed: number;
  active: number;
}

export interface Campaign {
  id: number;
  name: string;
  subject: string;
  content_html: string;
  audience_type: string;
  audience_ids: number[];
  status: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_by: number;
  created_at: string;
  sent_at: string | null;
  creator_name: string | null;
}

export interface CampaignsResponse {
  campaigns: Campaign[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone1: string;
  phone2: string;
  address1: string;
  address2: string;
  district: string;
  state: string;
  pincode: string;
  role: string;
  created_at: string;
  newsletter_subscribed: boolean;
  order_count: number;
}

export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class NewsletterService {
  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('admin_authToken');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  // Public APIs
  subscribe(email: string, name?: string, headers?: HttpHeaders): Observable<any> {
    return this.http.post('/api/newsletter/subscribe', { email, name }, { headers });
  }

  verifyToken(token: string): Observable<{ email: string }> {
    return this.http.get<{ email: string }>(`/api/newsletter/verify-token?token=${token}`);
  }

  unsubscribe(token: string): Observable<any> {
    return this.http.post('/api/newsletter/unsubscribe', { token });
  }

  // Admin Users
  getUsers(params: any = {}): Observable<any> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) queryParams.set(key, String(value));
    });
    return this.http.get(`/api/admin/users?${queryParams.toString()}`, { headers: this.getAuthHeaders() });
  }

  getUser(id: number): Observable<any> {
    return this.http.get(`/api/admin/users/${id}`, { headers: this.getAuthHeaders() });
  }

  // Admin Newsletter Subscribers
  getSubscribers(params: any = {}): Observable<any> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) queryParams.set(key, String(value));
    });
    return this.http.get(`/api/admin/newsletter/subscribers?${queryParams.toString()}`, { headers: this.getAuthHeaders() });
  }

  getStats(): Observable<any> {
    return this.http.get('/api/admin/newsletter/stats', { headers: this.getAuthHeaders() });
  }

  // Campaigns
  getCampaigns(params: any = {}): Observable<any> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) queryParams.set(key, String(value));
    });
    return this.http.get(`/api/admin/newsletter/campaigns?${queryParams.toString()}`, { headers: this.getAuthHeaders() });
  }

  getCampaign(id: number): Observable<any> {
    return this.http.get(`/api/admin/newsletter/campaigns/${id}`, { headers: this.getAuthHeaders() });
  }

  createCampaign(data: any): Observable<any> {
    return this.http.post('/api/admin/newsletter/campaigns', data, { headers: this.getAuthHeaders() });
  }

  updateCampaign(id: number, data: any): Observable<any> {
    return this.http.patch(`/api/admin/newsletter/campaigns/${id}`, data, { headers: this.getAuthHeaders() });
  }

  deleteCampaign(id: number): Observable<any> {
    return this.http.delete(`/api/admin/newsletter/campaigns/${id}`, { headers: this.getAuthHeaders() });
  }

  sendCampaign(id: number, audience: any): Observable<any> {
    return this.http.post(`/api/admin/newsletter/campaigns/${id}/send`, audience, { headers: this.getAuthHeaders() });
  }

  sendTestEmail(data: any): Observable<any> {
    return this.http.post('/api/admin/newsletter/test', data, { headers: this.getAuthHeaders() });
  }
}