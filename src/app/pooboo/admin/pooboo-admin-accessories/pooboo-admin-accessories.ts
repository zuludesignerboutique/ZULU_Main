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

type AccessoryTab = 'baby-ornaments' | 'bands' | 'hair-clips';

@Component({
  selector: 'app-pooboo-admin-accessories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pooboo-admin-accessories.html',
  styleUrl: './pooboo-admin-accessories.scss'
})
export class PoobooAdminAccessories implements OnInit {

  private api = '';

  // ── List state ────────────────────────────────────────
  allProducts: any[] = [];
  loading  = true;
  error    = '';

  // ── Search ────────────────────────────────────────────
  searchQuery = '';

  // ── Tabs ──────────────────────────────────────────────
  activeTab: AccessoryTab = 'baby-ornaments';

  tabs: { key: AccessoryTab; label: string; emoji: string }[] = [
    { key: 'baby-ornaments', label: 'Baby Ornaments', emoji: '🌟' },
    { key: 'bands',          label: 'Bands',          emoji: '💛' },
    { key: 'hair-clips',     label: 'Hair Clips',     emoji: '🩷' },
  ];

  // ── Form visibility ───────────────────────────────────
  showForm = false;

  // ── Add-form fields ───────────────────────────────────
  a_name              = '';
  a_description       = '';
  a_price             = '';
  a_stock             = '';
  a_balance_stock     = '';
  a_product_code      = '';
  a_colour            = '';
  a_accessoryCategory : AccessoryTab = 'baby-ornaments';

  // Images — multi (max 4)
  readonly maxImages = 4;
  readonly imageLabels = ['Front', 'Back', 'Side', 'Full'];
  a_selectedImages: SelectedImage[] = [];

  // 🏷️ Tags — preset badges + custom free-text tags, merged into one array
  presetTags     = ['New', 'Bestseller', 'Sale'];
  selectedTags   : string[] = [];
  customTagInput = '';

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
    this.loadAccessories();
  }

  // ── Toggle add form (pre-fill type to active tab) ─────
  toggleForm() {
    this.showForm = !this.showForm;
    if (this.showForm) {
      this.a_accessoryCategory = this.activeTab;
    } else {
      this.resetForm();
    }
  }

  // ── Load accessories ──────────────────────────────────
  loadAccessories() {
    const isFirstLoad = this.allProducts.length === 0;
    if (isFirstLoad) {
      this.loading = true;
    }

    this.http.get<any[]>(`${this.api}/api/pooboo/accessories/all`).subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.allProducts = data;
          this.loading     = false;
          this.error       = '';
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          if (isFirstLoad) {
            this.error = 'Failed to load accessories';
          }
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ── Tab helpers ───────────────────────────────────────
  setTab(tab: AccessoryTab) {
    this.activeTab = tab;
  }

  private matchesSearch(p: any): boolean {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (p.name || '').toLowerCase().includes(q) ||
           (p.product_code || '').toLowerCase().includes(q);
  }

  getTabProductsAll(tab: AccessoryTab): any[] {
    return this.allProducts.filter(p => p.accessory_type === tab);
  }

  getTabProducts(tab: AccessoryTab): any[] {
    return this.allProducts.filter(p => p.accessory_type === tab && this.matchesSearch(p));
  }

  getTabCount(tab: AccessoryTab): number {
    return this.getTabProductsAll(tab).length;
  }

  getActiveTabLabel(): string {
    return this.tabs.find(t => t.key === this.activeTab)?.label ?? '';
  }

  // ── Image handling ────────────────────────────────────
  async onAccFilesChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    const remaining = this.maxImages - this.a_selectedImages.length;
    if (remaining <= 0) {
      this.errorMsg = `You can upload a maximum of ${this.maxImages} images per accessory.`;
      input.value = '';
      this.cdr.detectChanges();
      return;
    }
    const toAdd = files.slice(0, remaining);
    if (toAdd.length < files.length) {
      this.errorMsg = `Only ${this.maxImages} images are allowed per accessory. ${toAdd.length} image(s) added.`;
    } else {
      this.errorMsg = '';
    }
    try {
      const compressed = await this.imageUpload.compressAndPreview(toAdd);
      this.zone.run(() => {
        compressed.forEach(c => this.a_selectedImages.push({ file: c.file, preview: c.preview, label: '' }));
        this.cdr.detectChanges();
      });
    } catch {
      toAdd.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.zone.run(() => {
            this.a_selectedImages.push({ file, preview: e.target?.result as string || '', label: '' });
            this.cdr.detectChanges();
          });
        };
        reader.readAsDataURL(file);
      });
    }
    input.value = '';
    this.cdr.detectChanges();
  }

  removeAccImage(index: number): void {
    this.a_selectedImages.splice(index, 1);
    this.errorMsg = '';
    this.cdr.detectChanges();
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

  // ── Submit add-accessory form ─────────────────────────
  submitAccessory() {
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
    formData.append('accessory_type', this.a_accessoryCategory);
    formData.append('stock',          this.a_stock);
    formData.append('balance_stock',  this.a_balance_stock);
    formData.append('product_code',   this.a_product_code);
    formData.append('colour',         this.a_colour);
    formData.append('tags',           JSON.stringify(this.selectedTags));

    this.a_selectedImages.forEach(img => formData.append('images', img.file));
    formData.append('labels', JSON.stringify(this.a_selectedImages.map(img => img.label)));

    this.http.post(`${this.api}/api/pooboo/accessories`, formData).subscribe({
      next: () => {
        this.successMsg = '✅ Accessory added successfully!';
        this.submitting = false;
        this.cdr.detectChanges();
        this.activeTab  = this.a_accessoryCategory;
        this.loadAccessories();
        setTimeout(() => {
          this.resetForm();
          this.showForm = false;
        }, 800);
      },
      error: (err) => {
        console.error('Add accessory error:', err);
        this.errorMsg   = this.imageUpload.extractUploadError(err);
        this.submitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Reset form fields ─────────────────────────────────
  resetForm() {
    this.a_name              = '';
    this.a_description       = '';
    this.a_price             = '';
    this.a_stock             = '';
    this.a_balance_stock     = '';
    this.a_product_code      = '';
    this.a_colour            = '';
    this.a_accessoryCategory = this.activeTab;
    this.a_selectedImages    = [];
    this.selectedTags        = [];
    this.customTagInput      = '';
    this.errorMsg            = '';
    this.successMsg          = '';
  }

  // ── Table actions ─────────────────────────────────────
  editProduct(id: number) {
    this.router.navigate(['/admin/pooboo/edit-accessory', id]);
  }

  async deleteProduct(id: number, name: string) {
    const confirmed = await this.toast.confirm({
      title: 'Delete accessory?',
      message: `Delete "${name}"? This cannot be undone.`,
      confirmLabel: 'Delete'
    });
    if (!confirmed) return;
    this.http.delete(`${this.api}/api/pooboo/accessories/${id}`).subscribe({
      next: () => this.loadAccessories(),
      error: () => this.toast.error('Failed to delete accessory')
    });
  }

  getImageUrl(img: string | null): string {
    if (!img) return 'assets/images/placeholder.png';
    return img.startsWith('http') ? img : `${this.api}/uploads/${img}`;
  }
}
