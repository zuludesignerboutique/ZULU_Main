import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-pooboo-admin-fabrics',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pooboo-admin-fabrics.html',
  styleUrl: './pooboo-admin-fabrics.scss'
})
export class PoobooAdminFabrics implements OnInit {

  private api = 'http://localhost:4000';

  // ── List state ────────────────────────────────────────
  products: any[] = [];
  loading  = true;
  error    = '';

  // ── Form visibility ───────────────────────────────────
  showForm = false;

  // ── Add-form fields ───────────────────────────────────
  f_name             = '';
  f_description      = '';
  f_price_per_meter  = '';
  f_total_meters     = '';
  f_balance_stock    = '';
  f_product_code     = '';
  f_colour           = '';
  f_selectedFile     : File | null = null;
  f_imagePreview     : string | null = null;

  // ── UI state ──────────────────────────────────────────
  submitting = false;
  successMsg = '';
  errorMsg   = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadFabrics();
  }

  // ── Toggle add form ───────────────────────────────────
  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) this.resetForm();
  }

  // ── Load fabric list ──────────────────────────────────
  loadFabrics() {
    this.loading = true;
    this.http.get<any[]>(`${this.api}/api/pooboo/fabrics/all`).subscribe({
      next: (data) => {
        this.products = data;
        this.loading  = false;
      },
      error: () => {
        this.error   = 'Failed to load fabrics';
        this.loading = false;
      }
    });
  }

  // ── Image handling ────────────────────────────────────
  onFabricFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.f_selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => this.f_imagePreview = e.target?.result as string;
      reader.readAsDataURL(this.f_selectedFile);
    }
  }

  removeFabricImage() {
    this.f_selectedFile = null;
    this.f_imagePreview = null;
  }

  // ── Submit add-fabric form ────────────────────────────
  submitFabric() {
    if (!this.f_name || !this.f_price_per_meter) {
      this.errorMsg = 'Name and price are required.';
      return;
    }

    this.submitting = true;
    this.errorMsg   = '';
    this.successMsg = '';

    const formData = new FormData();
    formData.append('name',            this.f_name);
    formData.append('description',     this.f_description);
    formData.append('price_per_meter', this.f_price_per_meter);
    formData.append('total_meters',    this.f_total_meters);
    formData.append('balance_stock',   this.f_balance_stock);
    formData.append('product_code',    this.f_product_code);
    formData.append('colour',          this.f_colour);

    if (this.f_selectedFile) {
      formData.append('image', this.f_selectedFile);
    }

    this.http.post(`${this.api}/api/pooboo/fabrics`, formData).subscribe({
      next: () => {
        this.successMsg = '✅ Fabric added successfully!';
        this.submitting = false;
        this.resetForm();
        this.showForm   = false;
        this.loadFabrics();
      },
      error: () => {
        this.errorMsg   = '❌ Failed to add fabric. Please try again.';
        this.submitting = false;
      }
    });
  }

  // ── Reset form fields ─────────────────────────────────
  resetForm() {
    this.f_name             = '';
    this.f_description      = '';
    this.f_price_per_meter  = '';
    this.f_total_meters     = '';
    this.f_balance_stock    = '';
    this.f_product_code     = '';
    this.f_colour           = '';
    this.f_selectedFile     = null;
    this.f_imagePreview     = null;
    this.errorMsg           = '';
    this.successMsg         = '';
  }

  // ── Table actions ─────────────────────────────────────
  editProduct(id: number) {
    this.router.navigate(['/admin/pooboo/edit-fabric', id]);
  }

  deleteProduct(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    this.http.delete(`${this.api}/api/pooboo/fabrics/${id}`).subscribe({
      next: () => this.loadFabrics(),
      error: () => alert('Failed to delete fabric')
    });
  }

  getImageUrl(img: string | null): string {
    if (!img) return 'assets/images/placeholder.png';
    return img.startsWith('http') ? img : `${this.api}/uploads/${img}`;
  }
}