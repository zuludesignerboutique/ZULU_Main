import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-edit-product',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './edit-product.html',
  styleUrl: './edit-product.scss'
})
export class EditProduct implements OnInit {

  product: any = {};
  selectedFile!: File;
  imagePreview: string | null = null;   // ← new: for upload area preview
  isSaving: boolean = false;

  imageBase: string = 'http://localhost:4000/uploads/';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.params['id'];

    this.http.get<any[]>('http://localhost:4000/api/products')
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
        }
      });
  }

  onFileSelect(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.selectedFile = file;

    // Show preview in the upload area
    const reader = new FileReader();
    reader.onload = (e: any) => this.imagePreview = e.target.result;
    reader.readAsDataURL(file);
  }

  removeImage(event: Event) {
    event.stopPropagation();
    this.imagePreview = null;
    this.selectedFile = null!;
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

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.http.put(
      `http://localhost:4000/api/products/${this.product.id}`,
      formData
    ).subscribe({
      next: () => {
        this.isSaving = false;
        alert('Product updated successfully!');
        this.router.navigate(['/admin/products']);
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Update error:', err);
        alert('Failed to update product. Please try again.');
      }
    });
  }
}