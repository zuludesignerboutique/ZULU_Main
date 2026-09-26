import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ImageUploadService } from '../../../services/image-upload.service';

interface SelectedImage {
  file: File;
  preview: string;
  label: string;
}

@Component({
  selector: 'app-pooboo-add-product',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pooboo-add-product.html',
  styleUrl: './pooboo-add-product.scss'
})
export class PoobooAddProduct {

  private api = '';

  // Form fields
  name          = '';
  description   = '';
  price         = '';
  category      = '';
  gender        = 'unisex';
  stock         = '';
  product_code  = '';
  is_customizable = false;
  is_active     = true;

  // Age Groups — tick-box multi (preset 8, no custom)
  selectedAgeGroups: string[] = [];
  readonly presetAgeGroups = ['0-6 months', '6-12 months', '1-2 years', '2-3 years', '3-5 years', '5-7 years', '7-10 years', '10-12 years'];

  // Sizes & colours as comma-separated input
  sizesInput    = '';
  coloursInput  = '';

  // Details (bullet points)
  detailsInput  = '';

  // 🏷️ Tags — preset badges + custom free-text tags, merged into one array
  presetTags    = ['New', 'Bestseller', 'Sale'];
  selectedTags  : string[] = [];
  customTagInput = '';

  // Images — multi (max 4)
  readonly maxImages = 6;
  readonly imageLabels = ['Front', 'Back', 'Side', 'Full'];
  selectedImages: SelectedImage[] = [];

  // UI state
  submitting = false;
  successMsg = '';
  errorMsg   = '';

  // Dropdown options
  categories = ['Clothing', 'Footwear', 'Innerwear', 'Nightwear'];
  genders    = ['unisex', 'boy', 'girl'];

  // NEW: product type (apparel / fabric / accessory)
  productType: 'apparel' | 'fabric' | 'accessory' = 'apparel';
  accessoryCategory = 'baby-ornaments';
  accessoryCategories = [
    { value: 'baby-ornaments', label: '🌟 Baby Ornaments' },
    { value: 'bands',          label: '💛 Bands' },
    { value: 'hair-clips',     label: '🩷 Hair Clips' },
  ];

  constructor(private http: HttpClient, private router: Router, private route: ActivatedRoute, private cdr: ChangeDetectorRef, private imageUpload: ImageUploadService) {}


  async onFilesChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;

    const remaining = this.maxImages - this.selectedImages.length;
    if (remaining <= 0) {
      this.errorMsg = `You can upload a maximum of ${this.maxImages} images per product.`;
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    const toAdd = files.slice(0, remaining);
    if (toAdd.length < files.length) {
      this.errorMsg = `Only ${this.maxImages} images are allowed per product. ${toAdd.length} image(s) added.`;
    } else {
      this.errorMsg = '';
    }

    try {
      const compressed = await this.imageUpload.compressAndPreview(toAdd);
      compressed.forEach(c => this.selectedImages.push({ file: c.file, preview: c.preview, label: '' }));
    } catch {
      toAdd.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.selectedImages.push({
            file,
            preview: (e.target?.result as string) || '',
            label: ''
          });
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      });
    }

    input.value = '';
    this.cdr.detectChanges();
  }

  removeImage(index: number) {
    this.selectedImages.splice(index, 1);
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

  toggleAgeGroup(age: string) {
    this.selectedAgeGroups = this.selectedAgeGroups.includes(age)
      ? this.selectedAgeGroups.filter(a => a !== age)
      : [...this.selectedAgeGroups, age];
  }
  isAgeSelected(age: string): boolean {
    return this.selectedAgeGroups.includes(age);
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

  onSubmit() {
    if (!this.name || !this.price) {
      this.errorMsg = 'Name and price are required.';
      return;
    }

    const totalBytes = this.selectedImages.reduce((n, img) => n + (img.file?.size || 0), 0);
    if (totalBytes > 4 * 1024 * 1024) {
      const mb = (totalBytes / 1024 / 1024).toFixed(1);
      this.errorMsg = `Selected images total ${mb} MB — please remove 1 image or re-pick smaller ones (limit 4 MB total).`;
      this.cdr.detectChanges();
      return;
    }

    this.submitting = true;
    this.errorMsg   = '';
    this.successMsg = '';

    const formData = new FormData();
    formData.append('name',            this.name);
    formData.append('description',     this.description);
    formData.append('price',           this.price);

    // Determine final category based on product type
    let finalCategory = this.category;
    if (this.productType === 'fabric') {
      finalCategory = 'fabric';
    } else if (this.productType === 'accessory') {
      finalCategory = this.accessoryCategory;
    }
    formData.append('category',        finalCategory);

    formData.append('age_groups',       JSON.stringify(this.selectedAgeGroups));
    formData.append('gender',          this.gender);
    formData.append('stock',           this.stock);
    formData.append('product_code',    this.product_code);
    formData.append('is_customizable', this.is_customizable ? '1' : '0');
    formData.append('is_active',       this.is_active ? '1' : '0');

    // Sizes → JSON array
    const sizesArr = this.sizesInput.split(',').map(s => s.trim()).filter(Boolean);
    formData.append('sizes', JSON.stringify(sizesArr));

    // Colours → JSON array
    const coloursArr = this.coloursInput.split(',').map(s => s.trim()).filter(Boolean);
    formData.append('colours', JSON.stringify(coloursArr));

    // Details → JSON array
    const detailsArr = this.detailsInput.split('\n').map(s => s.trim()).filter(Boolean);
    formData.append('details', JSON.stringify(detailsArr));

    // Tags → JSON array (preset badges + custom, already merged in selectedTags)
    formData.append('tags', JSON.stringify(this.selectedTags));

    this.selectedImages.forEach(img => formData.append('images', img.file));
    formData.append('labels', JSON.stringify(this.selectedImages.map(img => img.label)));

    this.http.post(`${this.api}/api/pooboo/products`, formData).subscribe({
      next: () => {
        this.successMsg = '✅ Product added successfully!';
        this.submitting = false;
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/admin/pooboo/products']), 1200);
      },
      error: (err) => {
        this.errorMsg   = this.imageUpload.extractUploadError(err);
        this.submitting = false;
        this.cdr.detectChanges();
      }
    });
  }
}
