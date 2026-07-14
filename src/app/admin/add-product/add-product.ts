import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CategoryService, Category, Subcategory } from '../../services/category.service';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './add-product.html',
  styleUrls: ['./add-product.scss']
})
export class AddProduct implements OnInit {

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

  // ── Categories / subcategories (loaded from DB) ────────
  categories: Category[] = [];
  subcategories: Subcategory[] = [];       // subs for the currently selected category (form dropdown)
  allSubcategories: Subcategory[] = [];    // every subcategory (sidebar "Category Guide")
  private selectedCategoryId: number | null = null;

  // ── "+ Add New Category" inline widget state ───────────
  addingCategory = false;
  newCategoryName = '';
  categorySaveError = '';
  savingCategory = false;

  // ── "+ Add New Subcategory" inline widget state ────────
  addingSubcategory = false;
  newSubcategoryName = '';
  subcategorySaveError = '';
  savingSubcategory = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.loadAllSubcategories();
  }

  // ── Load categories ─────────────────────────────────────
  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats;
        this.cdr.detectChanges(); // force view update — subscribe callback doesn't always trigger CD on its own
      },
      error: (err) => console.error('[AddProduct] Failed to load categories:', err)
    });
  }

  // ── Load every subcategory (for the sidebar Category Guide) ──
  loadAllSubcategories() {
    this.categoryService.getSubcategories().subscribe({
      next: (subs) => {
        this.allSubcategories = subs;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('[AddProduct] Failed to load all subcategories:', err)
    });
  }

  // Used by the sidebar to show each category's subs without re-fetching
  getSubsForCategory(categoryId: number): Subcategory[] {
    return this.allSubcategories.filter(s => s.category_id === categoryId);
  }

  // ── Category change (existing category picked) ─────────
  onCategoryChange() {
    this.product.subcategory = '';
    this.subcategories = [];
    this.addingSubcategory = false;

    const match = this.categories.find(c => c.name === this.product.category);
    this.selectedCategoryId = match ? match.id : null;

    if (this.selectedCategoryId) {
      this.categoryService.getSubcategories(this.selectedCategoryId).subscribe({
        next: (subs) => {
          this.subcategories = subs;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('[AddProduct] Failed to load subcategories:', err)
      });
    }
  }

  // ── Inline "Add New Category" widget ────────────────────
  toggleAddCategory() {
    this.addingCategory = !this.addingCategory;
    this.newCategoryName = '';
    this.categorySaveError = '';
  }

  saveNewCategory() {
    const name = this.newCategoryName.trim();
    if (!name) {
      this.categorySaveError = 'Please enter a category name.';
      return;
    }

    this.savingCategory = true;
    this.categorySaveError = '';

    this.categoryService.addCategory(name).subscribe({
      next: (created) => {
        this.savingCategory = false;
        this.categories.push(created);
        this.categories.sort((a, b) => a.name.localeCompare(b.name));
        this.product.category = created.name;
        this.onCategoryChange();
        this.addingCategory = false;
        this.newCategoryName = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingCategory = false;
        this.categorySaveError = err?.error?.error || 'Failed to add category. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  // ── Inline "Add New Subcategory" widget ─────────────────
  toggleAddSubcategory() {
    if (!this.selectedCategoryId) return;
    this.addingSubcategory = !this.addingSubcategory;
    this.newSubcategoryName = '';
    this.subcategorySaveError = '';
  }

  saveNewSubcategory() {
    const name = this.newSubcategoryName.trim();
    if (!name) {
      this.subcategorySaveError = 'Please enter a subcategory name.';
      return;
    }
    if (!this.selectedCategoryId) {
      this.subcategorySaveError = 'Please select a category first.';
      return;
    }

    this.savingSubcategory = true;
    this.subcategorySaveError = '';

    this.categoryService.addSubcategory(this.selectedCategoryId, name).subscribe({
      next: (created) => {
        this.savingSubcategory = false;
        this.subcategories.push(created);
        this.subcategories.sort((a, b) => a.name.localeCompare(b.name));
        this.allSubcategories.push(created);
        this.product.subcategory = created.name;
        this.addingSubcategory = false;
        this.newSubcategoryName = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingSubcategory = false;
        this.subcategorySaveError = err?.error?.error || 'Failed to add subcategory. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  // ── Image handling ───────────────────────────────────────
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  removeImage(event: Event) {
    event.stopPropagation();
    this.selectedFile = null;
    this.imagePreview = null;
  }

  // ── Submit ────────────────────────────────────────────────
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
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/admin/products']), 1500);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMsg = 'Failed to add product. Please try again.';
        this.cdr.detectChanges();
        console.error(err);
      }
    });
  }
}