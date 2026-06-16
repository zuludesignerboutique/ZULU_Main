import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-pooboo-edit-product',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pooboo-edit-product.html',
  styleUrl: './pooboo-edit-product.scss'
})
export class PoobooEditProduct implements OnInit {

  private api = 'http://localhost:4000';
  productId!: number;

  // Form fields
  name            = '';
  description     = '';
  price           = '';
  category        = '';
  age_group       = '';
  gender          = 'unisex';
  stock           = '';
  product_code    = '';
  is_customizable = false;
  is_active       = true;
  sizesInput      = '';
  coloursInput    = '';
  detailsInput    = '';

  // Image
  existingImage   : string | null = null;
  selectedFile    : File | null = null;
  imagePreview    : string | null = null;

  // UI state
  loading    = true;
  submitting = false;
  successMsg = '';
  errorMsg   = '';

  // Dropdown options
  categories = ['Clothing', 'Footwear', 'Innerwear', 'Nightwear'];
  ageGroups  = ['0-6 months', '6-12 months', '1-2 years', '2-3 years', '3-5 years', '5-7 years', '7-10 years', '10-12 years'];
  genders    = ['unisex', 'boy', 'girl'];

  // NEW: product type (apparel / fabric / accessory)
  productType: 'apparel' | 'fabric' | 'accessory' = 'apparel';
  accessoryCategory = 'baby-ornaments';
  accessoryCategories = [
    { value: 'baby-ornaments', label: '🌟 Baby Ornaments' },
    { value: 'bands',          label: '💛 Bands' },
    { value: 'hair-clips',     label: '🩷 Hair Clips' },
  ];

  constructor(
    private http   : HttpClient,
    private router : Router,
    private route  : ActivatedRoute
  ) {}

  ngOnInit() {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProduct();
  }

  loadProduct() {
    this.http.get<any>(`${this.api}/api/pooboo/products/${this.productId}`).subscribe({
      next: (p) => {
        this.name            = p.name           || '';
        this.description     = p.description    || '';
        this.price           = p.price          || '';
        this.category        = p.category       || '';
        this.age_group       = p.age_group      || '';
        this.gender          = p.gender         || 'unisex';
        this.stock           = p.stock          || '';
        this.product_code    = p.product_code   || '';
        this.is_customizable = p.is_customizable == 1;
        this.is_active       = p.is_active      != 0;
        this.existingImage   = p.image_url      || null;

        // Derive product type + sub-category from the stored category value
        const accessoryValues = this.accessoryCategories.map(a => a.value);
        if (p.category === 'fabric') {
          this.productType = 'fabric';
        } else if (accessoryValues.includes(p.category)) {
          this.productType = 'accessory';
          this.accessoryCategory = p.category;
        } else {
          this.productType = 'apparel';
        }

        // Arrays → comma separated strings for input fields
        this.sizesInput   = Array.isArray(p.sizes)   ? p.sizes.join(', ')   : '';
        this.coloursInput = Array.isArray(p.colours) ? p.colours.join(', ') : '';
        this.detailsInput = Array.isArray(p.details) ? p.details.join('\n') : '';

        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Failed to load product.';
        this.loading  = false;
      }
    });
  }

  getImageUrl(img: string): string {
    if (!img) return '';
    return img.startsWith('http') ? img : `${this.api}/uploads/${img}`;
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => this.imagePreview = e.target?.result as string;
      reader.readAsDataURL(this.selectedFile);
    }
  }

  removeNewImage() {
    this.selectedFile = null;
    this.imagePreview = null;
  }

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

    // Determine final category based on product type
    let finalCategory = this.category;
    if (this.productType === 'fabric') {
      finalCategory = 'fabric';
    } else if (this.productType === 'accessory') {
      finalCategory = this.accessoryCategory;
    }
    formData.append('category',        finalCategory);

    formData.append('age_group',       this.age_group);
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

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.http.put(`${this.api}/api/pooboo/products/${this.productId}`, formData).subscribe({
      next: () => {
        this.successMsg = '✅ Product updated successfully!';
        this.submitting = false;
        setTimeout(() => this.router.navigate(['/admin/pooboo/products']), 1200);
      },
      error: () => {
        this.errorMsg   = '❌ Failed to update product. Please try again.';
        this.submitting = false;
      }
    });
  }
}