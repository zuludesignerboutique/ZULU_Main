import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterModule } from '@angular/router';

interface User {
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

interface ApiResponse<T> {
  users: T[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss'
})
export class AdminUsers implements OnInit {
  users: User[] = [];
  totalUsers = 0;
  totalPages = 0;
  currentPage = 1;
  pageSize = 20;
  searchQuery = '';
  loading = false;
  searchDebounce: any;

  selectedUser: User | null = null;
  showModal = false;

  // Expose Math to template
  Math = Math;

  constructor(private http: HttpClient, private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    const params = new URLSearchParams();
    params.set('page', this.currentPage.toString());
    params.set('limit', this.pageSize.toString());
    if (this.searchQuery.trim()) {
      params.set('search', this.searchQuery.trim());
    }

    this.http.get<ApiResponse<User>>(`/api/admin/users?${params.toString()}`).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.users = res.users;
          this.totalUsers = res.total;
          this.totalPages = res.totalPages;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loading = false;
          this.cdr.detectChanges();
        });
        console.error('Failed to load users:', err);
      }
    });
  }

  onSearchInput() {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.currentPage = 1;
      this.loadUsers();
    }, 400);
  }

  clearSearch() {
    this.searchQuery = '';
    this.currentPage = 1;
    this.loadUsers();
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadUsers();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadUsers();
    }
  }

  openUserDetail(user: User) {
    this.selectedUser = user;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedUser = null;
  }

  formatAddress(user: User): string {
    const parts = [user.address1, user.address2, user.district, user.state, user.pincode]
      .filter(Boolean);
    return parts.join(', ') || '—';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  getStatusBadgeClass(subscribed: boolean): string {
    return subscribed ? 'bg-success' : 'bg-secondary';
  }

  getStatusText(subscribed: boolean): string {
    return subscribed ? 'Subscribed' : 'Not Subscribed';
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;

    if (end > this.totalPages) {
      end = this.totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadUsers();
    }
  }
}