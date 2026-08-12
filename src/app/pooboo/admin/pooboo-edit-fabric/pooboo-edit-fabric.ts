import { Component, NgZone, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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

  private api = '';
  private productId!: number;

  // ── Page state ─────────────────────────────────────────
  loading = true;
  error   = '';

  // ── Edit-form fields ───────────────────────────────────
  f_name            = '';
  f_fabric_type     = '';
  f_description     = '';
  f_price_per_meter = '';
  f_total_meters    = '';
  f_balance_stock   = '';
  f_product_code    = '';
  f_colour          = '';
  f_selectedFile    : File | null = null;
  f_imagePreview    : string | null = null;
  f_existingImage   : string | null = null;

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

  // ── Fabric type options (must match admin add-form & storefront) ──
  fabricTypes = [
    { label: 'Cotton',     value: 'cotton',     emoji: '🌿' },
    { label: 'Silk',       value: 'silk',        emoji: '✨' },
    { label: 'Linen',      value: 'linen',      emoji: '🍃' },
    { label: 'Georgette',  value: 'georgette',  emoji: '🌸' },
    { label: 'Net',        value: 'net',        emoji: '🕸️' },
    { label: 'Velvet',     value: 'velvet',     emoji: '💜' },
    {label: 'satin',      value: 'satin',      emoji: '💫' },
  ];

  // ── UI state ────────────────────────────────────────────
  submitting = false;
  successMsg = '';
  errorMsg   = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
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
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }
    this.loading = true;
    console.log('[EditFabric] loading id:', this.productId);
    this.http.get<any>(`${this.api}/api/pooboo/fabrics/${this.productId}`).subscribe({
      next: (p) => {
        console.log('[EditFabric] loaded:', p);
        this.zone.run(() => {
          this.f_name            = p.name ?? '';
          this.f_fabric_type     = p.fabric_type ?? '';
          this.f_description     = p.description ?? '';
          this.f_price_per_meter = p.price_per_meter ?? '';
          this.f_total_meters    = p.total_meters ?? '';
          this.f_balance_stock   = p.balance_stock ?? '';
          this.f_product_code    = p.product_code ?? '';
          this.f_colour          = p.colour ?? '';
          this.f_existingImage   = p.image_url ?? null;
          this.f_tags            = Array.isArray(p.tags) ? p.tags : [];
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('[EditFabric] error:', err);
        this.zone.run(() => {
          this.error   = 'Failed to load fabric';
          this.loading = false;
          this.cdr.detectChanges();
        });
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

    this.http.put(`${this.api}/api/pooboo/fabrics/${this.productId}`, formData).subscribe({
      next: () => {
        this.zone.run(() => {
          this.successMsg = '✅ Fabric updated successfully!';
          this.submitting = false;
          this.cdr.detectChanges();
          setTimeout(() => this.router.navigate(['/admin/pooboo/fabrics']), 800);
        });
      },
      error: () => {
        this.zone.run(() => {
          this.errorMsg   = '❌ Failed to update fabric. Please try again.';
          this.submitting = false;
          this.cdr.detectChanges();
        });
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