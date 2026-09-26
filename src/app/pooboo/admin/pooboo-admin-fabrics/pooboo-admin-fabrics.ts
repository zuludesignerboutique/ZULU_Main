import { Component, NgZone, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../services/toast.service';
import { ImageUploadService } from '../../../services/image-upload.service';

interface SelectedImage {
  file: File;
  preview: string;
  label: string;
}

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

  // Images — multi (max 4)
  readonly maxImages = 4;
  readonly imageLabels = ['Front', 'Back', 'Side', 'Full'];
  f_selectedImages: SelectedImage[] = [];

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
    private toast: ToastService,
    private imageUpload: ImageUploadService,
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
  async onFabricFilesChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;

    const remaining = this.maxImages - this.f_selectedImages.length;
    if (remaining <= 0) {
      this.errorMsg = `You can upload a maximum of ${this.maxImages} images per fabric.`;
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    const toAdd = files.slice(0, remaining);
    if (toAdd.length < files.length) {
      this.errorMsg = `Only ${this.maxImages} images are allowed per fabric. ${toAdd.length} image(s) added.`;
    } else {
      this.errorMsg = '';
    }

    try {
      const compressed = await this.imageUpload.compressAndPreview(toAdd);
      this.zone.run(() => {
        compressed.forEach(c => this.f_selectedImages.push({ file: c.file, preview: c.preview, label: '' }));
        this.cdr.detectChanges();
      });
    } catch {
      toAdd.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.zone.run(() => {
            this.f_selectedImages.push({ file, preview: e.target?.result as string || '', label: '' });
            this.cdr.detectChanges();
          });
        };
        reader.readAsDataURL(file);
      });
    }
    input.value = '';
    this.cdr.detectChanges();
  }

  removeFabricImage(index: number): void {
    this.f_selectedImages.splice(index, 1);
    this.errorMsg = '';
    this.cdr.detectChanges();
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

    this.f_selectedImages.forEach(img => formData.append('images', img.file));
    formData.append('labels', JSON.stringify(this.f_selectedImages.map(img => img.label)));

    this.http.post(`${this.api}/api/pooboo/fabrics`, formData).subscribe({
      next: () => {
        this.successMsg = '✅ Fabric added successfully!';
        this.submitting = false;
        this.cdr.detectChanges();
        this.loadFabrics();
        setTimeout(() => {
          this.resetForm();
          this.showForm = false;
        }, 800);
      },
      error: (err) => {
        this.errorMsg   = this.imageUpload.extractUploadError(err);
        this.submitting = false;
        this.cdr.detectChanges();
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
    this.f_selectedImages   = [];
    this.f_tags             = [];
    this.f_customTag        = '';
    this.errorMsg           = '';
    this.successMsg         = '';
  }

  // ── Table actions ─────────────────────────────────────
  editProduct(id: number) {
    this.router.navigate(['/admin/pooboo/edit-fabric', id]);
  }

  async deleteProduct(id: number, name: string) {
    const confirmed = await this.toast.confirm({
      title: 'Delete fabric?',
      message: `Delete "${name}"? This cannot be undone.`,
      confirmLabel: 'Delete'
    });
    if (!confirmed) return;
    this.http.delete(`${this.api}/api/pooboo/fabrics/${id}`).subscribe({
      next: () => this.loadFabrics(),
      error: () => this.toast.error('Failed to delete fabric')
    });
  }

  getImageUrl(img: string | null): string {
    if (!img) return 'assets/images/placeholder.png';
    return img.startsWith('http') ? img : `${this.api}/uploads/${img}`;
  }
}
