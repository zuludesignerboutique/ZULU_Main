import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { PoobooProductService } from '../../services/pooboo-product.service';
import { ToastService } from '../../../services/toast.service';
import { ImageUploadService } from '../../../services/image-upload.service';

interface NewImage {
  file: File;
  preview: string;
  label: string;
}

@Component({
  selector: 'app-pooboo-edit-product',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pooboo-edit-product.html',
  styleUrl: './pooboo-edit-product.scss'
})
export class PoobooEditProduct implements OnInit {

  private api = '';
  productId!: number;

  // Form fields
  name            = '';
  description     = '';
  price           = '';
  category        = '';
  gender          = 'unisex';
  stock           = '';
  product_code    = '';
  is_customizable = false;
  is_active       = true;
  sizesInput      = '';
  coloursInput    = '';
  detailsInput    = '';

  // Age Groups — tick-box multi (preset 8, no custom)
  selectedAgeGroups: string[] = [];
  readonly presetAgeGroups = ['0-6 months', '6-12 months', '1-2 years', '2-3 years', '3-5 years', '5-7 years', '7-10 years', '10-12 years'];

  presetTags      = ['New', 'Bestseller', 'Sale'];
  selectedTags    : string[] = [];
  customTagInput  = '';

  // Images — multi (max 4)
  readonly maxImages = 4;
  readonly imageLabels = ['Front', 'Back', 'Side', 'Full'];
  existingImages: any[] = [];
  newImages: NewImage[] = [];
  imageBusy = false;
  imageMsg = '';
  imageMsgError = false;
  imageBase = '/uploads/';

  // UI state
  loading    = true;
  submitting = false;
  successMsg = '';
  errorMsg   = '';

  categories = ['Clothing', 'Footwear', 'Innerwear', 'Nightwear'];
  genders    = ['unisex', 'boy', 'girl'];

  productType: 'apparel' | 'fabric' | 'accessory' = 'apparel';
  accessoryCategory = 'baby-ornaments';
  accessoryCategories = [
    { value: 'baby-ornaments', label: '🌟 Baby Ornaments' },
    { value: 'bands',          label: '💛 Bands' },
    { value: 'hair-clips',     label: '🩷 Hair Clips' },
  ];

  get totalImageCount(): number { return this.existingImages.length + this.newImages.length; }
  get canAddMoreImages(): boolean { return this.totalImageCount < this.maxImages; }

  constructor(
    private http   : HttpClient,
    private router : Router,
    private route  : ActivatedRoute,
    private cd     : ChangeDetectorRef,
    private ngZone : NgZone,
    private productService: PoobooProductService,
    private toast: ToastService,
    private imageUpload: ImageUploadService
  ) {}

  ngOnInit() {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProduct();
  }

  loadProduct() {
    this.http.get<any>(`${this.api}/api/pooboo/products/${this.productId}`).subscribe({
      next: (p) => {
        this.ngZone.run(() => {
          this.name            = p.name           || '';
          this.description     = p.description    || '';
          this.price           = p.price          || '';
          this.category        = p.category       || '';
          this.gender          = p.gender         || 'unisex';
          // age_groups is array; fallback to legacy single age_group
          if (Array.isArray(p.age_groups) && p.age_groups.length) this.selectedAgeGroups = [...p.age_groups];
          else if (p.age_group) this.selectedAgeGroups = [String(p.age_group)];
          else this.selectedAgeGroups = [];
          this.stock           = p.stock          || '';
          this.product_code    = p.product_code   || '';
          this.is_customizable = p.is_customizable === 1 || p.is_customizable === true;
          this.is_active       = p.is_active      != 0;

          const accessoryValues = this.accessoryCategories.map(a => a.value);
          if (p.category === 'fabric') {
            this.productType = 'fabric';
          } else if (accessoryValues.includes(p.category)) {
            this.productType = 'accessory';
            this.accessoryCategory = p.category;
          } else {
            this.productType = 'apparel';
          }

          this.sizesInput   = Array.isArray(p.sizes)   ? p.sizes.join(', ')   : '';
          this.coloursInput = Array.isArray(p.colours) ? p.colours.join(', ') : '';
          this.detailsInput = Array.isArray(p.details) ? p.details.join('\n') : '';
          this.selectedTags = Array.isArray(p.tags)    ? [...p.tags]          : [];
          this.existingImages = Array.isArray(p.images) ? [...p.images].sort((a,b)=>a.display_order-b.display_order) : [];

          this.loading = false;
          this.cd.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.errorMsg = 'Failed to load product.';
          this.loading  = false;
          this.cd.detectChanges();
        });
      }
    });
  }

  getImageUrl(img: string): string {
    if (!img) return '';
    return img.startsWith('http') ? img : `${this.api}/uploads/${img}`;
  }

  // ── Upload new images ──
  async onNewFilesChange(event: any) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    const remaining = this.maxImages - this.totalImageCount;
    if (remaining <= 0) {
      this.setImageMsg(`You can upload a maximum of ${this.maxImages} images per product.`, true);
      input.value = '';
      this.ngZone.run(() => this.cd.detectChanges());
      return;
    }
    const toAdd = files.slice(0, remaining);
    if (toAdd.length < files.length) {
      this.setImageMsg(`Only ${this.maxImages} images are allowed per product. ${toAdd.length} image(s) added.`, true);
    } else {
      this.imageMsg = '';
    }
    try {
      const compressed = await this.imageUpload.compressAndPreview(toAdd);
      compressed.forEach(c => this.newImages.push({ file: c.file, preview: c.preview, label: '' }));
    } catch {
      toAdd.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.newImages.push({ file, preview: e.target.result, label: '' });
          this.ngZone.run(() => this.cd.detectChanges());
        };
        reader.readAsDataURL(file);
      });
    }
    input.value = '';
    this.ngZone.run(() => this.cd.detectChanges());
  }

  removeNewImage(index: number) {
    this.newImages.splice(index, 1);
    this.imageMsg = '';
    this.ngZone.run(() => this.cd.detectChanges());
  }

  addPendingImages() {
    if (!this.newImages.length || !this.productId) return;
    this.imageBusy = true;
    this.imageMsg = '';
    this.imageMsgError = false;
    this.uploadPendingImages(this.productId).subscribe({
      next: () => {
        this.imageBusy = false;
        this.newImages = [];
        this.setImageMsg('Image(s) added successfully.', false);
        this.reloadGallery();
      },
      error: (err) => {
        this.imageBusy = false;
        this.setImageMsg(this.imageUpload.extractUploadError(err), true);
      }
    });
  }

  private uploadPendingImages(productId: number) {
    return this.productService.addImages(productId, this.newImages.map(n=>n.file), this.newImages.map(n=>n.label));
  }

  async deleteImage(image: any) {
    if (!this.productId || !image?.id) return;
    const confirmed = await this.toast.confirm({ title: 'Delete image?', message: 'Delete this image? This can\'t be undone.', confirmLabel: 'Delete' });
    if (!confirmed) return;
    this.imageBusy = true;
    this.imageMsg = '';
    this.imageMsgError = false;
    this.productService.deleteImage(this.productId, image.id).subscribe({
      next: () => {
        this.imageBusy = false;
        this.existingImages = this.existingImages.filter(i => i.id !== image.id);
        this.setImageMsg('Image deleted successfully.', false);
        this.ngZone.run(() => this.cd.detectChanges());
      },
      error: (err) => {
        this.imageBusy = false;
        this.setImageMsg(this.imageUpload.extractUploadError(err), true);
      }
    });
  }

  moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= this.existingImages.length) return;
    const arr = [...this.existingImages];
    [arr[index], arr[target]] = [arr[target], arr[index]];
    this.existingImages = arr;
    this.saveOrderAndLabels();
  }

  saveOrderAndLabels() {
    if (!this.productId || !this.existingImages.length) return;
    const orderedIds = this.existingImages.map(i => i.id);
    const labels: Record<number, string> = {};
    this.existingImages.forEach(i => { labels[i.id] = i.label || ''; });
    this.imageBusy = true;
    this.imageMsg = '';
    this.imageMsgError = false;
    this.productService.reorderImages(this.productId, orderedIds, labels).subscribe({
      next: () => {
        this.imageBusy = false;
        this.setImageMsg('Image order saved.', false);
        this.ngZone.run(() => this.cd.detectChanges());
      },
      error: (err) => {
        this.imageBusy = false;
        this.setImageMsg(this.imageUpload.extractUploadError(err), true);
      }
    });
  }

  private reloadGallery() {
    this.http.get<any>(`${this.api}/api/pooboo/products/${this.productId}`).subscribe(data => {
      this.existingImages = Array.isArray(data.images) ? [...data.images].sort((a,b)=>a.display_order-b.display_order) : [];
      this.ngZone.run(() => this.cd.detectChanges());
    });
  }

  private setImageMsg(msg: string, isError: boolean) {
    this.imageMsg = msg;
    this.imageMsgError = isError;
    this.ngZone.run(() => this.cd.detectChanges());
  }

  togglePresetTag(tag: string) {
    this.selectedTags = this.selectedTags.includes(tag)
      ? this.selectedTags.filter(t => t !== tag)
      : [...this.selectedTags, tag];
  }
  isTagSelected(tag: string): boolean { return this.selectedTags.includes(tag); }
  toggleAgeGroup(age: string) {
    this.selectedAgeGroups = this.selectedAgeGroups.includes(age)
      ? this.selectedAgeGroups.filter(a => a !== age)
      : [...this.selectedAgeGroups, age];
  }
  isAgeSelected(age: string): boolean { return this.selectedAgeGroups.includes(age); }
  addCustomTag() {
    const tag = this.customTagInput.trim();
    if (tag && !this.selectedTags.includes(tag)) this.selectedTags = [...this.selectedTags, tag];
    this.customTagInput = '';
  }
  removeTag(tag: string) { this.selectedTags = this.selectedTags.filter(t => t !== tag); }

  onSubmit() {
    if (!this.name || !this.price) {
      this.errorMsg = 'Name and price are required.';
      return;
    }

    this.submitting = true;
    this.errorMsg   = '';
    this.successMsg = '';

    const formData = new FormData();
    formData.append('name',            this.name);
    formData.append('description',     this.description);
    formData.append('price',           this.price);
    let finalCategory = this.category;
    if (this.productType === 'fabric') finalCategory = 'fabric';
    else if (this.productType === 'accessory') finalCategory = this.accessoryCategory;
    formData.append('category',        finalCategory);
    formData.append('age_groups',       JSON.stringify(this.selectedAgeGroups));
    formData.append('gender',          this.gender);
    formData.append('stock',           this.stock);
    formData.append('product_code',    this.product_code);
    formData.append('is_customizable', this.is_customizable ? '1' : '0');
    formData.append('is_active',       this.is_active       ? '1' : '0');

    const sizesArr   = this.sizesInput.split(',').map(s => s.trim()).filter(Boolean);
    const coloursArr = this.coloursInput.split(',').map(s => s.trim()).filter(Boolean);
    const detailsArr = this.detailsInput.split('\n').map(s => s.trim()).filter(Boolean);

    formData.append('sizes',   JSON.stringify(sizesArr));
    formData.append('colours', JSON.stringify(coloursArr));
    formData.append('details', JSON.stringify(detailsArr));
    formData.append('tags',    JSON.stringify(this.selectedTags));

    this.http.put(`${this.api}/api/pooboo/products/${this.productId}`, formData).subscribe({
      next: () => {
        if (this.newImages.length) {
          this.uploadPendingImages(this.productId).subscribe({
            next: () => {
              this.ngZone.run(() => {
                this.successMsg = '✅ Product updated successfully!';
                this.submitting = false;
                this.cd.detectChanges();
                setTimeout(() => this.router.navigate(['/admin/pooboo/products']), 1200);
              });
            },
            error: (err) => {
              this.ngZone.run(() => {
                this.submitting = false;
                this.toast.error('Product details were saved, but the new images failed to upload: ' + this.imageUpload.extractUploadError(err));
                this.cd.detectChanges();
              });
            }
          });
          return;
        }
        this.ngZone.run(() => {
          this.successMsg = '✅ Product updated successfully!';
          this.submitting = false;
          this.cd.detectChanges();
          setTimeout(() => this.router.navigate(['/admin/pooboo/products']), 1200);
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.errorMsg   = '❌ Failed to update product. Please try again.';
          this.submitting = false;
          this.cd.detectChanges();
        });
      }
    });
  }
}
