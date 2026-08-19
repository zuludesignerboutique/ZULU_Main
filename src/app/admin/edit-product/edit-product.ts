import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { ToastService } from '../../services/toast.service';

// A file picked by the admin that hasn't been saved to the server yet.
interface NewImage {
  file: File;
  preview: string;
  label: string;
}

@Component({
  selector: 'app-edit-product',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './edit-product.html',
  styleUrl: './edit-product.scss'
})
export class EditProduct implements OnInit {

  product: any = {};
  isSaving: boolean = false;

  readonly maxImages = 4;
  readonly imageLabels = ['Front', 'Back', 'Side', 'Full'];
  // Suggested tags shown as quick-pick chips + datalist autocomplete.
  // Purely a UX shortcut — product.tag is free text, so a custom value
  // (or the tag already saved on this product) always works too.
  readonly suggestedTags = ['Popular', 'New', 'Bestseller', 'Trending', 'Limited Edition', 'Sale'];

  // Gallery rows already saved in the DB (from product.images)
  existingImages: any[] = [];
  // Files selected but not yet uploaded
  newImages: NewImage[] = [];

  // Image operation state
  imageBusy = false;
  imageMsg = '';
  imageMsgError = false;

  imageBase: string = '/uploads/';

  // ── Category → allowed subcategories (must match dropdown option text exactly) ──
  categorySubMap: Record<string, string[]> = {
    'Bridal Collection': ['Bridal Blouse', 'Bridal Saree', 'Lehenga', 'Gown', 'Half Saree'],
    'Groom Collection':  ['Designer Shirt', 'Traditional Dhoti'],
    'Party Wear':        ['Party Gown', 'Designer Kurti', 'Western Dress'],
    'Casual Wear':       ['T-Shirts', 'Casual Shirts', 'Everyday Wear'],
  };

  get availableSubcategories(): string[] {
    return this.categorySubMap[this.product.category] || [];
  }

  get totalImageCount(): number {
    return this.existingImages.length + this.newImages.length;
  }

  get canAddMoreImages(): boolean {
    return this.totalImageCount < this.maxImages;
  }

  // Only clears the subcategory when the user actively changes the category
  // dropdown to something whose sub-list no longer includes the current value.
  // Does NOT run during ngOnInit's initial data load (that's a plain property
  // assignment, not a view event), so existing saved products load correctly.
  onCategoryChange() {
    const validSubs = this.categorySubMap[this.product.category] || [];
    if (!validSubs.includes(this.product.subcategory)) {
      this.product.subcategory = '';
    }
  }

  // Clicking a suggested chip fills the box; clicking the same chip again
  // clears it back to "no tag".
  selectTag(tag: string) {
    this.product.tag = (this.product.tag === tag) ? '' : tag;
  }

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private productService: ProductService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private toast: ToastService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.params['id'];

    this.http.get<any[]>('/api/products')
      .subscribe(data => {
        const found = data.find(p => p.id == id);
        if (found) {
          this.product = found;

          if (Array.isArray(this.product.sizes)) {
            this.product.sizesRaw = this.product.sizes.join(', ');
          } else {
            this.product.sizesRaw = this.product.sizes || '';
          }

          if (Array.isArray(this.product.details)) {
            this.product.detailsRaw = this.product.details.join('\n');
          } else {
            this.product.detailsRaw = this.product.details || '';
          }

          // Load the saved gallery (sorted by display_order)
          this.existingImages = Array.isArray(found.images)
            ? [...found.images].sort((a, b) => a.display_order - b.display_order)
            : [];
        }

        // ── Fix for "form fields blank until click" ──
        // If HttpClient is using the fetch-based backend (provideHttpClient(withFetch())),
        // the response resolves via native fetch(), which zone.js does NOT patch.
        // That means Angular never schedules change detection when this data arrives,
        // so the form stays blank until some unrelated zone-patched event (a click)
        // triggers a CD pass. Forcing it here inside ngZone.run() guarantees the view
        // updates the instant the data is set, with no dependency on user interaction.
        this.ngZone.run(() => {
          this.cdr.detectChanges();
        });
      });
  }

  // ── Upload new images ────────────────────────────
  onNewFilesChange(event: any) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;

    const remaining = this.maxImages - this.totalImageCount;
    if (remaining <= 0) {
      this.setImageMsg(`You can upload a maximum of ${this.maxImages} images per product.`, true);
      input.value = '';
      this.ngZone.run(() => this.cdr.detectChanges());
      return;
    }

    const toAdd = files.slice(0, remaining);
    if (toAdd.length < files.length) {
      this.setImageMsg(`Only ${this.maxImages} images are allowed per product. ${toAdd.length} image(s) added.`, true);
    } else {
      this.imageMsg = '';
    }

    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.newImages.push({ file, preview: e.target.result, label: '' });
        this.ngZone.run(() => this.cdr.detectChanges());
      };
      reader.readAsDataURL(file);
    });

    input.value = '';
    this.ngZone.run(() => this.cdr.detectChanges());
  }

  removeNewImage(index: number) {
    this.newImages.splice(index, 1);
    this.imageMsg = '';
    this.ngZone.run(() => this.cdr.detectChanges());
  }

  // Save the pending new files to the product gallery (manual "Upload new
  // images" button — for adding images without touching other fields)
  addPendingImages() {
    if (!this.newImages.length || !this.product?.id) return;
    this.imageBusy = true;
    this.imageMsg = '';
    this.imageMsgError = false;

    this.uploadPendingImages(this.product.id).subscribe({
      next: () => {
        this.imageBusy = false;
        this.newImages = [];
        this.setImageMsg('Image(s) added successfully.', false);
        this.reloadGallery();
      },
      error: (err) => {
        this.imageBusy = false;
        this.setImageMsg(err?.error?.error || 'Failed to add images. Please try again.', true);
      }
    });
  }

  // Shared upload call — used by the standalone "Upload new images" button
  // AND automatically by Save Changes below, so picked files can never be
  // silently discarded regardless of which action the admin clicks.
  private uploadPendingImages(productId: number) {
    return this.productService.addImages(
      productId,
      this.newImages.map(n => n.file),
      this.newImages.map(n => n.label)
    );
  }

  // Delete an existing gallery image
  async deleteImage(image: any) {
    if (!this.product?.id || !image?.id) return;
    const confirmed = await this.toast.confirm({
      title: 'Delete image?',
      message: 'Delete this image? This can\'t be undone.',
      confirmLabel: 'Delete'
    });
    if (!confirmed) return;

    this.imageBusy = true;
    this.imageMsg = '';
    this.imageMsgError = false;

    this.productService.deleteImage(this.product.id, image.id).subscribe({
      next: () => {
        this.imageBusy = false;
        this.existingImages = this.existingImages.filter(i => i.id !== image.id);
        this.setImageMsg('Image deleted successfully.', false);
        this.ngZone.run(() => this.cdr.detectChanges());
      },
      error: (err) => {
        this.imageBusy = false;
        this.setImageMsg(err?.error?.error || 'Failed to delete image. Please try again.', true);
      }
    });
  }

  // Move an existing image up/down in the gallery, then persist the new order
  moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= this.existingImages.length) return;

    const arr = [...this.existingImages];
    [arr[index], arr[target]] = [arr[target], arr[index]];
    this.existingImages = arr;
    this.saveOrderAndLabels();
  }

  // Persist the current gallery order + labels
  saveOrderAndLabels() {
    if (!this.product?.id || !this.existingImages.length) return;

    const orderedIds = this.existingImages.map(i => i.id);
    const labels: Record<number, string> = {};
    this.existingImages.forEach(i => { labels[i.id] = i.label || ''; });

    this.imageBusy = true;
    this.imageMsg = '';
    this.imageMsgError = false;

    this.productService.reorderImages(this.product.id, orderedIds, labels).subscribe({
      next: () => {
        this.imageBusy = false;
        this.setImageMsg('Image order saved.', false);
        // Keep the thumbnail in sync (the first gallery image is the thumbnail)
        if (this.existingImages[0]) {
          this.product.image_url = this.existingImages[0].image_url;
        }
        this.ngZone.run(() => this.cdr.detectChanges());
      },
      error: (err) => {
        this.imageBusy = false;
        this.setImageMsg(err?.error?.error || 'Failed to save image order.', true);
      }
    });
  }

  // Re-fetch product so the gallery reflects server state
  private reloadGallery() {
    this.http.get<any[]>(`/api/products`)
      .subscribe(data => {
        const found = data.find(p => p.id == this.product.id);
        if (found) {
          this.product.image_url = found.image_url;
          this.existingImages = Array.isArray(found.images)
            ? [...found.images].sort((a, b) => a.display_order - b.display_order)
            : [];
        }
        this.ngZone.run(() => this.cdr.detectChanges());
      });
  }

  private setImageMsg(msg: string, isError: boolean) {
    this.imageMsg = msg;
    this.imageMsgError = isError;
    this.ngZone.run(() => this.cdr.detectChanges());
  }

  updateProduct() {
    this.isSaving = true;

    const formData = new FormData();

    formData.append('name',         this.product.name         || '');
    formData.append('description',  this.product.description  || '');
    formData.append('price',        this.product.price        || 0);
    formData.append('category',     this.product.category     || '');
    formData.append('subcategory',  this.product.subcategory  || '');
    formData.append('stock',        this.product.stock ? this.product.stock.toString() : '0');
    formData.append('product_code', this.product.product_code || '');
    formData.append('size',         this.product.size         || '');
    formData.append('tag',          this.product.tag          || '');
    formData.append('colour',       this.product.colour       || '');
    formData.append('fit',          this.product.fit          || '');
    formData.append('care',         this.product.care         || '');

    const sizesArray = (this.product.sizesRaw || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    formData.append('sizes', JSON.stringify(sizesArray));

    const detailsArray = (this.product.detailsRaw || '')
      .split('\n')
      .map((s: string) => s.replace(/^\*\s*/, '').trim())
      .filter(Boolean);
    formData.append('details', JSON.stringify(detailsArray));

    this.http.put(
      `/api/products/${this.product.id}`,
      formData
    ).subscribe({
      next: () => {
        // If images were picked but never uploaded via the standalone button,
        // upload them now instead of silently dropping them on navigate.
        if (this.newImages.length) {
          this.uploadPendingImages(this.product.id).subscribe({
            next: () => {
              this.isSaving = false;
              this.newImages = [];
              this.toast.success('Product and images updated successfully!');
              this.router.navigate(['/admin/products']);
            },
            error: (err) => {
              this.isSaving = false;
              console.error('Image upload error:', err);
              this.toast.error(
                'Product details were saved, but the new images failed to upload: ' +
                (err?.error?.error || 'please try "Upload new images" again before leaving this page.')
              );
              // Stay on the page — newImages is untouched, so nothing is lost
              // and the admin can retry the upload immediately.
            }
          });
          return;
        }

        this.isSaving = false;
        this.toast.success('Product updated successfully!');
        this.router.navigate(['/admin/products']);
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Update error:', err);
        this.toast.error('Failed to update product. Please try again.');
      }
    });
  }
}