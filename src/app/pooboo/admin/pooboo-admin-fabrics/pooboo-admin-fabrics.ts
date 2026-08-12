import { Component, NgZone, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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

  private api = '';

  // ── List state ────────────────────────────────────────
  products: any[] = [];
  loading  = true;
  error    = '';

  // ── Search ────────────────────────────────────────────
  searchQuery = '';

  get filteredProducts(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.products;
    return this.products.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.product_code || '').toLowerCase().includes(q)
    );
  }

  // ── Form visibility ───────────────────────────────────
  showForm = false;

  // ── Add-form fields ───────────────────────────────────
  f_name             = '';
  f_fabric_type      = '';
  f_description      = '';
  f_price_per_meter  = '';
  f_total_meters     = '';
  f_balance_stock    = '';
  f_product_code     = '';
  f_colour           = '';
  f_selectedFile     : File | null = null;
  f_imagePreview     : string | null = null;

  // ── Tags ────────────────────────────────────────────────
  f_tags: string[] = [];
  f_customTag = '';
  presetTags = ['New', 'Bestseller', 'Sale'];

  togglePresetTag(tag: string) {
    const i = this.f_tags.indexOf(tag);
    if (i > -1) this.f_tags.splice(i, 1);
    else this.f_tags.push(tag);
  }

  addCustomTag() {
    const t = this.f_customTag.trim();
    if (t && !this.f_tags.includes(t)) this.f_tags.push(t);
    this.f_customTag = '';
  }

  removeTag(tag: string) {
    this.f_tags = this.f_tags.filter(t => t !== tag);
  }

  // ── Fabric type options (must match storefront fabricTypes) ──
  fabricTypes = [
    { label: 'Cotton',     value: 'cotton',     emoji: '🌿' },
    { label: 'Silk',       value: 'silk',        emoji: '✨' },
    { label: 'Linen',      value: 'linen',       emoji: '🍃' },
    { label: 'Georgette',  value: 'georgette',   emoji: '🌸' },
    { label: 'Net',        value: 'net',         emoji: '🕸️' },
    { label: 'Velvet',     value: 'velvet',      emoji: '💜' },
    {label: 'satin',      value: 'satin',       emoji: '💫' },
  ];

  getTypeLabel(value: string): string {
    return this.fabricTypes.find(t => t.value === value)?.label ?? (value || '—');
  }

  // ── UI state ──────────────────────────────────────────
  submitting = false;
  successMsg = '';
  errorMsg   = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
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
        // zone.run() + detectChanges() guarantees Angular repaints the view
        // right away. Without this, during SSR/hydration this callback can
        // resolve outside a change-detection window (the transfer-cache
        // response comes back synchronously), so `loading`/`products`
        // update in memory but the DOM keeps showing "Loading fabrics..."
        // until some unrelated click forces change detection.
        this.zone.run(() => {
          this.products = data;
          this.loading  = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.error   = 'Failed to load fabrics';
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ── Image handling ────────────────────────────────────
  f_imageUploading = false;

  onFabricUploadClick(input: HTMLInputElement): void {
    if (this.f_imageUploading) return;
    input.click();
  }

  onFabricFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.f_imageUploading = true;   // ← show spinner

    const reader = new FileReader();
    reader.onload = (e) => {
      this.zone.run(() => {
        this.f_imagePreview   = e.target?.result as string;
        this.f_selectedFile   = file;
        this.f_imageUploading = false;
        input.value = '';          // allow re-selecting the same file later
      });
    };
    reader.onerror = () => {
      this.zone.run(() => {
        this.f_imageUploading = false;
        this.errorMsg = 'Failed to read image. Please try again.';
        input.value = '';
      });
    };
    reader.readAsDataURL(file);
  }

  removeFabricImage(): void {
    this.f_imagePreview   = null;
    this.f_selectedFile   = null;
    this.f_imageUploading = false;
  }

  // ── Submit add-fabric form ────────────────────────────
  submitFabric() {
    if (!this.f_name || !this.f_price_per_meter || !this.f_fabric_type) {
      this.errorMsg = 'Name, price, and fabric type are required.';
      return;
    }

    this.submitting = true;
    this.errorMsg   = '';
    this.successMsg = '';

    const formData = new FormData();
    formData.append('name',            this.f_name);
    formData.append('fabric_type',     this.f_fabric_type);
    formData.append('description',     this.f_description);
    formData.append('price_per_meter', this.f_price_per_meter);
    formData.append('total_meters',    this.f_total_meters);
    formData.append('balance_stock',   this.f_balance_stock);
    formData.append('product_code',    this.f_product_code);
    formData.append('colour',          this.f_colour);
    formData.append('tags',            JSON.stringify(this.f_tags));

    if (this.f_selectedFile) {
      formData.append('image', this.f_selectedFile);
    }

    this.http.post(`${this.api}/api/pooboo/fabrics`, formData).subscribe({
      next: () => {
        this.successMsg = '✅ Fabric added successfully!';
        this.submitting = false;
        this.loadFabrics();
        // give the user a moment to see the success message before the
        // form resets and closes
        setTimeout(() => {
          this.resetForm();
          this.showForm = false;
        }, 800);
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
    this.f_fabric_type      = '';
    this.f_description      = '';
    this.f_price_per_meter  = '';
    this.f_total_meters     = '';
    this.f_balance_stock    = '';
    this.f_product_code     = '';
    this.f_colour           = '';
    this.f_selectedFile     = null;
    this.f_imagePreview     = null;
    this.f_tags             = [];
    this.f_customTag        = '';
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