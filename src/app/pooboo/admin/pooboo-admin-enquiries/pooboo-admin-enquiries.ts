import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../services/toast.service';

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

  constructor(private http: HttpClient, private toast: ToastService) {}

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

  async deleteEnquiry(id: number) {
    const confirmed = await this.toast.confirm({
      title: 'Delete enquiry?',
      message: 'Delete this enquiry? This cannot be undone.',
      confirmLabel: 'Delete'
    });
    if (!confirmed) return;
    this.http.delete(`/api/pooboo/enquiries/${id}`).subscribe({
      next: () => this.loadEnquiries()
    });
  }
}
