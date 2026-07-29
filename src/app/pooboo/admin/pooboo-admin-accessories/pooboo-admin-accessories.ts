import { Component, NgZone, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

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
  a_selectedFile      : File | null = null;
  a_imagePreview      : string | null = null;

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
    this.loadAccessories();
  }

  // ── Toggle add form (pre-fill type to active tab) ─────
  toggleForm() {
    this.showForm = !this.showForm;
    if (this.showForm) {
      // Pre-select the currently viewed tab's type
      this.a_accessoryCategory = this.activeTab;
    } else {
      this.resetForm();
    }
  }

  // ── Load accessories ──────────────────────────────────
  loadAccessories() {
    // Only show the big "Loading accessories..." state when we truly have
    // nothing on screen yet (first load). On any later call — SSR hydration
    // re-fetch, delete refresh, add-accessory refresh — keep showing the
    // existing rows and just swap them once the fresh data arrives. This
    // stops the table from blanking out during SSR/hydration timing races.
    const isFirstLoad = this.allProducts.length === 0;
    if (isFirstLoad) {
      this.loading = true;
    }

    this.http.get<any[]>(`${this.api}/api/pooboo/accessories/all`).subscribe({
      next: (data) => {
        // zone.run() + detectChanges() guarantees Angular repaints the view
        // right away. Without detectChanges(), during SSR/hydration this
        // callback can resolve outside a change-detection window (the
        // transfer-cache response comes back synchronously), so
        // `loading`/`allProducts` update in memory but the DOM keeps
        // showing "Loading accessories..." until some unrelated click
        // forces change detection.
        this.zone.run(() => {
          this.allProducts = data;
          this.loading     = false;
          this.error       = '';
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          // Only surface the error state if we have nothing to show at all.
          // If we already have data on screen, silently keep it rather than
          // replacing it with an error message.
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

  getTabProducts(tab: AccessoryTab): any[] {
    return this.allProducts.filter(p => p.accessory_type === tab);
  }

  getTabCount(tab: AccessoryTab): number {
    return this.allProducts.filter(p => p.accessory_type === tab).length;
  }

  getActiveTabLabel(): string {
    return this.tabs.find(t => t.key === this.activeTab)?.label ?? '';
  }

  // ── Image handling ────────────────────────────────────
  a_imageUploading = false;

  onAccUploadClick(input: HTMLInputElement): void {
    if (this.a_imageUploading) return;
    input.click();
  }

  onAccFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.a_imageUploading = true;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.zone.run(() => {
        this.a_imagePreview   = e.target?.result as string;
        this.a_selectedFile   = file;
        this.a_imageUploading = false;
        input.value = '';        // allow re-selecting the same file later
      });
    };
    reader.onerror = () => {
      this.zone.run(() => {
        this.a_imageUploading = false;
        this.errorMsg = 'Failed to read image. Please try again.';
        input.value = '';
      });
    };
    reader.readAsDataURL(file);
  }

  removeAccImage(): void {
    this.a_imagePreview   = null;
    this.a_selectedFile   = null;
    this.a_imageUploading = false;
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
    formData.append('accessory_type', this.a_accessoryCategory); // baby-ornaments / bands / hair-clips
    formData.append('stock',          this.a_stock);
    formData.append('balance_stock',  this.a_balance_stock);
    formData.append('product_code',   this.a_product_code);
    formData.append('colour',         this.a_colour);

    if (this.a_selectedFile) {
      formData.append('image', this.a_selectedFile);
    }

    this.http.post(`${this.api}/api/pooboo/accessories`, formData).subscribe({
      next: () => {
        this.successMsg = '✅ Accessory added successfully!';
        this.submitting = false;
        // Switch to the tab of what was just added
        this.activeTab  = this.a_accessoryCategory;
        this.loadAccessories();
        // give the user a moment to see the success message before the
        // form resets and closes
        setTimeout(() => {
          this.resetForm();
          this.showForm = false;
        }, 800);
      },
      error: (err) => {
        console.error('Add accessory error:', err);
        // Show the backend's actual message when it sends one, instead of
        // hiding it behind a generic string — makes issues like this one
        // (a missing DB column) visible immediately instead of needing devtools.
        this.errorMsg   = err?.error?.error
          ? `❌ ${err.error.error}`
          : '❌ Failed to add accessory. Please try again.';
        this.submitting = false;
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
    this.a_selectedFile      = null;
    this.a_imagePreview      = null;
    this.errorMsg            = '';
    this.successMsg          = '';
  }

  // ── Table actions ─────────────────────────────────────
  editProduct(id: number) {
    this.router.navigate(['/admin/pooboo/edit-accessory', id]);
  }

  deleteProduct(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    this.http.delete(`${this.api}/api/pooboo/accessories/${id}`).subscribe({
      next: () => this.loadAccessories(),
      error: () => alert('Failed to delete accessory')
    });
  }

  getImageUrl(img: string | null): string {
    if (!img) return 'assets/images/placeholder.png';
    return img.startsWith('http') ? img : `${this.api}/uploads/${img}`;
  }
}