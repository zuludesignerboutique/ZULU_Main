import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-pooboo-add-product',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pooboo-add-product.html',
  styleUrl: './pooboo-add-product.scss'
})
export class PoobooAddProduct {

  private api = 'http://localhost:4000';

  // Form fields
  name          = '';
  description   = '';
  price         = '';
  category      = '';
  age_group     = '';
  gender        = 'unisex';
  stock         = '';
  product_code  = '';
  is_customizable = false;
  is_active     = true;

  // Sizes & colours as comma-separated input
  sizesInput    = '';
  coloursInput  = '';

  // Details (bullet points)
  detailsInput  = '';

  // Image
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  // UI state
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

  constructor(private http: HttpClient, private router: Router, private route: ActivatedRoute) {}


  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => this.imagePreview = e.target?.result as string;
      reader.readAsDataURL(this.selectedFile);
    }
  }

  removeImage() {
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

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.http.post(`${this.api}/api/pooboo/products`, formData).subscribe({
      next: () => {
        this.successMsg = '✅ Product added successfully!';
        this.submitting = false;
        setTimeout(() => this.router.navigate(['/admin/pooboo/products']), 1200);
      },
      error: () => {
        this.errorMsg   = '❌ Failed to add product. Please try again.';
        this.submitting = false;
      }
    });
  }
}