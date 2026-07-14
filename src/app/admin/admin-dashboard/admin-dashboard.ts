import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard implements OnInit {

  totalProducts = 0;
  totalUsers = 0;
  totalOrders = 0;

  private api = 'http://localhost:4000';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any[]>(`${this.api}/api/products`).subscribe({
      next: (data) => this.totalProducts = data.length,
      error: (err) => console.error('Dashboard: Failed to load products', err)
    });

    this.http.get<any[]>(`${this.api}/api/users`).subscribe({
      next: (data) => this.totalUsers = data.length,
      error: (err) => console.error('Dashboard: Failed to load users', err)
    });

    this.http.get<any[]>(`${this.api}/api/orders`).subscribe({
      next: (data) => this.totalOrders = data.length,
      error: (err) => console.error('Dashboard: Failed to load orders', err)
    });
  }
}