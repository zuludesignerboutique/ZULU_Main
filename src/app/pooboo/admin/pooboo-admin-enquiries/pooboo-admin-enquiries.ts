import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pooboo-admin-enquiries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pooboo-admin-enquiries.html',
  styleUrl: './pooboo-admin-enquiries.scss',
})
export class PoobooAdminEnquiries implements OnInit {
  enquiries: any[] = [];
  isLoading = true;
  filterStatus = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadEnquiries();
  }

  loadEnquiries() {
    this.isLoading = true;
    const url = this.filterStatus
      ? `/api/pooboo/enquiries?status=${this.filterStatus}`
      : '/api/pooboo/enquiries';
    this.http.get<any[]>(url).subscribe({
      next: (data) => { this.enquiries = data; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  updateStatus(id: number, status: string) {
    this.http.patch(`/api/pooboo/enquiries/${id}/status`, { status }).subscribe({
      next: () => this.loadEnquiries()
    });
  }

  deleteEnquiry(id: number) {
    if (confirm('Delete this enquiry?')) {
      this.http.delete(`/api/pooboo/enquiries/${id}`).subscribe({
        next: () => this.loadEnquiries()
      });
    }
  }
}
