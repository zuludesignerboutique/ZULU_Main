import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-pooboo-edit-fabric',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pooboo-edit-fabric.html',
  styleUrl: './pooboo-edit-fabric.scss'
})
export class PoobooEditFabric implements OnInit {

  private api = 'http://localhost:4000';
  private productId!: number;

  // ── Page state ─────────────────────────────────────────
  loading = true;
  error   = '';

  // ── Edit-form fields ───────────────────────────────────
  f_name            = '';
  f_description     = '';
  f_price_per_meter = '';
  f_total_meters    = '';
  f_balance_stock   = '';
  f_product_code    = '';
  f_colour          = '';
  f_selectedFile    : File | null = null;
  f_imagePreview    : string | null = null;
  f_existingImage   : string | null = null;

  // ── UI state ────────────────────────────────────────────
  submitting = false;
  successMsg = '';
  errorMsg   = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.error = 'No fabric id provided';
      this.loading = false;
      return;
    }
    this.productId = +idParam;
    this.loadFabric();
  }

  // ── Load existing fabric ───────────────────────────────
  loadFabric() {
    this.loading = true;
    this.http.get<any>(`${this.api}/api/pooboo/fabrics/${this.productId}`).subscribe({
      next: (p) => {
        this.f_name            = p.name ?? '';
        this.f_description     = p.description ?? '';
        this.f_price_per_meter = p.price_per_meter ?? '';
        this.f_total_meters    = p.total_meters ?? '';
        this.f_balance_stock   = p.balance_stock ?? '';
        this.f_product_code    = p.product_code ?? '';
        this.f_colour          = p.colour ?? '';
        this.f_existingImage   = p.image_url ?? null;
        this.loading = false;
      },
      error: () => {
        this.error   = 'Failed to load fabric';
        this.loading = false;
      }
    });
  }

  // ── Image handling ──────────────────────────────────────
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
    this.f_selectedFile  = null;
    this.f_imagePreview  = null;
    this.f_existingImage = null;
  }

  // ── Save changes ─────────────────────────────────────────
  saveFabric() {
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

    this.http.put(`${this.api}/api/pooboo/fabrics/${this.productId}`, formData).subscribe({
      next: () => {
        this.successMsg = '✅ Fabric updated successfully!';
        this.submitting = false;
        setTimeout(() => this.router.navigate(['/admin/pooboo/fabrics']), 800);
      },
      error: () => {
        this.errorMsg   = '❌ Failed to update fabric. Please try again.';
        this.submitting = false;
      }
    });
  }

  cancel() {
    this.router.navigate(['/admin/pooboo/fabrics']);
  }

  getImageUrl(img: string | null): string {
    if (!img) return 'assets/images/placeholder.png';
    return img.startsWith('http') ? img : `${this.api}/uploads/${img}`;
  }
}