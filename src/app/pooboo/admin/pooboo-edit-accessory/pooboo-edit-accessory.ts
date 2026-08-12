import { Component, NgZone, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

type AccessoryTab = 'baby-ornaments' | 'bands' | 'hair-clips';

@Component({
  selector: 'app-pooboo-edit-accessory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pooboo-edit-accessory.html',
  styleUrl: './pooboo-edit-accessory.scss'
})
export class PoobooEditAccessory implements OnInit {

  private api = '';
  private productId!: number;

  // ── Page state ─────────────────────────────────────────
  loading = true;
  error   = '';

  tabs: { key: AccessoryTab; label: string; emoji: string }[] = [
    { key: 'baby-ornaments', label: 'Baby Ornaments', emoji: '🌟' },
    { key: 'bands',          label: 'Bands',          emoji: '💛' },
    { key: 'hair-clips',     label: 'Hair Clips',     emoji: '🩷' },
  ];

  // ── Edit-form fields ───────────────────────────────────
  a_name              = '';
  a_description       = '';
  a_price             = '';
  a_stock             = '';
  a_balance_stock     = '';
  a_product_code      = '';
  a_colour            = '';
  a_accessoryCategory : AccessoryTab = 'baby-ornaments';
  a_selectedFile      : File | null = null;
  a_imagePreview      : string | null = null;
  a_existingImage     : string | null = null;

  // 🏷️ Tags — preset badges + custom free-text tags, merged into one array
  presetTags     = ['New', 'Bestseller', 'Sale'];
  selectedTags   : string[] = [];
  customTagInput = '';

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
      this.error = 'No accessory id provided';
      this.loading = false;
      return;
    }
    this.productId = +idParam;
    this.loadAccessory();
  }

  // ── Load existing accessory ────────────────────────────
  loadAccessory() {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }
    this.loading = true;
    console.log('[EditAccessory] loading id:', this.productId);
    this.http.get<any>(`${this.api}/api/pooboo/accessories/${this.productId}`).subscribe({
      next: (p) => {
        console.log('[EditAccessory] loaded:', p);
        this.zone.run(() => {
          this.a_name              = p.name ?? '';
          this.a_description       = p.description ?? '';
          this.a_price             = p.price ?? '';
          this.a_stock             = p.stock ?? '';
          this.a_balance_stock     = p.balance_stock ?? '';
          this.a_product_code      = p.product_code ?? '';
          this.a_colour            = p.colour ?? '';
          this.a_accessoryCategory = (p.accessory_type as AccessoryTab) ?? 'baby-ornaments';
          this.a_existingImage     = p.image_url ?? null;
          this.selectedTags        = Array.isArray(p.tags) ? [...p.tags] : [];
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('[EditAccessory] error:', err);
        this.zone.run(() => {
          this.error   = 'Failed to load accessory';
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ── Image handling ──────────────────────────────────────
  onAccFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.a_selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => this.a_imagePreview = e.target?.result as string;
      reader.readAsDataURL(this.a_selectedFile);
    }
  }

  removeAccImage() {
    this.a_selectedFile  = null;
    this.a_imagePreview  = null;
    this.a_existingImage = null;
  }

  // 🏷️ Toggle a preset badge on/off
  togglePresetTag(tag: string) {
    this.selectedTags = this.selectedTags.includes(tag)
      ? this.selectedTags.filter(t => t !== tag)
      : [...this.selectedTags, tag];
  }

  isTagSelected(tag: string): boolean {
    return this.selectedTags.includes(tag);
  }

  // 🏷️ Add a custom tag from the text input (Enter key or Add button)
  addCustomTag() {
    const tag = this.customTagInput.trim();
    if (tag && !this.selectedTags.includes(tag)) {
      this.selectedTags = [...this.selectedTags, tag];
    }
    this.customTagInput = '';
  }

  removeTag(tag: string) {
    this.selectedTags = this.selectedTags.filter(t => t !== tag);
  }

  // ── Save changes ─────────────────────────────────────────
  saveAccessory() {
    if (!this.a_name || !this.a_price) {
      this.errorMsg = 'Name and price are required.';
      return;
    }

    this.submitting = true;
    this.errorMsg   = '';
    this.successMsg = '';

    const formData = new FormData();
    formData.append('name',           this.a_name);
    formData.append('description',    this.a_description);
    formData.append('price',          this.a_price);
    formData.append('accessory_type', this.a_accessoryCategory); // baby-ornaments / bands / hair-clips
    formData.append('stock',          this.a_stock);
    formData.append('balance_stock',  this.a_balance_stock);
    formData.append('product_code',   this.a_product_code);
    formData.append('colour',         this.a_colour);
    formData.append('tags',           JSON.stringify(this.selectedTags));

    if (this.a_selectedFile) {
      formData.append('image', this.a_selectedFile);
    }

    this.http.put(`${this.api}/api/pooboo/accessories/${this.productId}`, formData).subscribe({
      next: () => {
        this.zone.run(() => {
          this.successMsg = '✅ Accessory updated successfully!';
          this.submitting = false;
          this.cdr.detectChanges();
          setTimeout(() => this.router.navigate(['/admin/pooboo/accessories']), 800);
        });
      },
      error: () => {
        this.zone.run(() => {
          this.errorMsg   = '❌ Failed to update accessory. Please try again.';
          this.submitting = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  cancel() {
    this.router.navigate(['/admin/pooboo/accessories']);
  }

  getImageUrl(img: string | null): string {
    if (!img) return 'assets/images/placeholder.png';
    return img.startsWith('http') ? img : `${this.api}/uploads/${img}`;
  }
}