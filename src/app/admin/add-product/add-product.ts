import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './add-product.html',
  styleUrls: ['./add-product.scss']
})
export class AddProduct {

  product = {
    name: '', description: '', price: 0,
    category: '', subcategory: '',
    stock: 0, product_code: '', size: ''
  };

  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isSubmitting = false;
  successMsg = '';
  errorMsg = '';

  categories = [
    { value: 'bridal', label: 'Bridal Collection' },
    { value: 'groom',  label: 'Groom Collection' },
    { value: 'party',  label: 'Party Wear' },
    { value: 'casual', label: 'Casual Wear' },
  ];

  subcategoryMap: Record<string, string[]> = {
    bridal: ['Bridal Blouse', 'Bridal Saree', 'Lehenga', 'Gown', 'Half Saree'],
    groom:  ['Designer Shirt', 'Traditional Dhoti'],
    party:  ['Party Gown', 'Designer Kurti', 'Western Dress'],
    casual: ['T-Shirts', 'Casual Shirts', 'Everyday Wear'],
  };

  get currentSubcategories(): string[] {
    return this.subcategoryMap[this.product.category] || [];
  }

  constructor(private http: HttpClient, private router: Router) {}

  onCategoryChange() {
    this.product.subcategory = '';
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => { this.imagePreview = e.target?.result as string; };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  removeImage(event: Event) {
    event.stopPropagation();
    this.selectedFile = null;
    this.imagePreview = null;
  }

  addProduct() {
    this.successMsg = '';
    this.errorMsg = '';

    if (!this.product.name || !this.product.price || !this.product.category || !this.product.subcategory) {
      this.errorMsg = 'Please fill in all required fields (Name, Price, Category, Subcategory).';
      return;
    }

    this.isSubmitting = true;

    const formData = new FormData();
    formData.append('name',         this.product.name);
    formData.append('description',  this.product.description);
    formData.append('price',        String(this.product.price));
    formData.append('category',     this.product.category);
    formData.append('subcategory',  this.product.subcategory);
    formData.append('stock',        String(this.product.stock));
    formData.append('product_code', this.product.product_code);
    formData.append('size',         this.product.size);
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.http.post('http://localhost:4000/api/products', formData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMsg = 'Product added successfully!';
        // Reset form after 1.5s then go to products list
        setTimeout(() => this.router.navigate(['/admin/products']), 1500);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMsg = 'Failed to add product. Please try again.';
        console.error(err);
      }
    });
  }
}