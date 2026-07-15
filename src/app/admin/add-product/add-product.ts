import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CategoryService, Category, Subcategory, InUseProduct } from '../../services/category.service';

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

  // ── Edit / delete state (categories) ────────────────────
  editingCategoryId: number | null = null;
  editCategoryName = '';
  categoryEditError = '';
  savingCategoryEdit = false;

  deleteCategoryTarget: Category | null = null;   // set while confirm/warning UI is open
  deleteCategoryBlockedProducts: InUseProduct[] | null = null; // populated if backend says "in use"
  deletingCategory = false;
  deleteCategoryError = '';

  // ── Edit / delete state (subcategories) ─────────────────
  editingSubcategoryId: number | null = null;
  editSubcategoryName = '';
  subcategoryEditError = '';
  savingSubcategoryEdit = false;

  deleteSubcategoryTarget: Subcategory | null = null;
  deleteSubcategoryBlockedProducts: InUseProduct[] | null = null;
  deletingSubcategory = false;
  deleteSubcategoryError = '';

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

  // ══════════════════════════════════════════════════════
  // EDIT / DELETE — CATEGORY
  // ══════════════════════════════════════════════════════

  startEditCategory(cat: Category, event: Event) {
    event.stopPropagation();
    this.editingCategoryId = cat.id;
    this.editCategoryName = cat.name;
    this.categoryEditError = '';
    // Close any other open widgets so we don't have overlapping inline forms
    this.addingCategory = false;
    this.deleteCategoryTarget = null;
  }

  cancelEditCategory() {
    this.editingCategoryId = null;
    this.editCategoryName = '';
    this.categoryEditError = '';
  }

  saveEditCategory(cat: Category) {
    const name = this.editCategoryName.trim();
    if (!name) {
      this.categoryEditError = 'Category name cannot be empty.';
      return;
    }
    if (name === cat.name) {
      this.cancelEditCategory();
      return;
    }

    this.savingCategoryEdit = true;
    this.categoryEditError = '';

    this.categoryService.updateCategory(cat.id, name).subscribe({
      next: (updated) => {
        this.savingCategoryEdit = false;

        // Update the category in-place
        const match = this.categories.find(c => c.id === cat.id);
        if (match) match.name = updated.name;
        this.categories.sort((a, b) => a.name.localeCompare(b.name));

        // Backend cascades the rename onto products, but the currently-selected
        // dropdown value in this form is just text, so keep it in sync too
        if (this.product.category === updated.oldName) {
          this.product.category = updated.name;
        }

        this.editingCategoryId = null;
        this.editCategoryName = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingCategoryEdit = false;
        this.categoryEditError = err?.error?.error || 'Failed to rename category. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  // Step 1: ask the backend whether this category is in use before actually deleting
  requestDeleteCategory(cat: Category, event: Event) {
    event.stopPropagation();
    this.deleteCategoryTarget = cat;
    this.deleteCategoryBlockedProducts = null;
    this.deleteCategoryError = '';
    // Close any other open widgets
    this.editingCategoryId = null;
    this.addingCategory = false;
  }

  cancelDeleteCategory() {
    this.deleteCategoryTarget = null;
    this.deleteCategoryBlockedProducts = null;
    this.deleteCategoryError = '';
  }

  confirmDeleteCategory(force = false) {
    if (!this.deleteCategoryTarget) return;
    const cat = this.deleteCategoryTarget;

    this.deletingCategory = true;
    this.deleteCategoryError = '';

    this.categoryService.deleteCategory(cat.id, force).subscribe({
      next: () => {
        this.deletingCategory = false;

        this.categories = this.categories.filter(c => c.id !== cat.id);
        this.allSubcategories = this.allSubcategories.filter(s => s.category_id !== cat.id);

        // If the deleted category was selected in the form, clear it
        if (this.product.category === cat.name) {
          this.product.category = '';
          this.product.subcategory = '';
          this.subcategories = [];
        }

        this.deleteCategoryTarget = null;
        this.deleteCategoryBlockedProducts = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.deletingCategory = false;

        // 409 with inUse:true means the backend is showing us the warning list
        if (err?.status === 409 && err?.error?.inUse) {
          this.deleteCategoryBlockedProducts = err.error.products || [];
        } else {
          this.deleteCategoryError = err?.error?.error || 'Failed to delete category. Please try again.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  // ══════════════════════════════════════════════════════
  // EDIT / DELETE — SUBCATEGORY
  // ══════════════════════════════════════════════════════

  startEditSubcategory(sub: Subcategory, event: Event) {
    event.stopPropagation();
    this.editingSubcategoryId = sub.id;
    this.editSubcategoryName = sub.name;
    this.subcategoryEditError = '';
    this.addingSubcategory = false;
    this.deleteSubcategoryTarget = null;
  }

  cancelEditSubcategory() {
    this.editingSubcategoryId = null;
    this.editSubcategoryName = '';
    this.subcategoryEditError = '';
  }

  saveEditSubcategory(sub: Subcategory) {
    const name = this.editSubcategoryName.trim();
    if (!name) {
      this.subcategoryEditError = 'Subcategory name cannot be empty.';
      return;
    }
    if (name === sub.name) {
      this.cancelEditSubcategory();
      return;
    }

    this.savingSubcategoryEdit = true;
    this.subcategoryEditError = '';

    this.categoryService.updateSubcategory(sub.id, name).subscribe({
      next: (updated) => {
        this.savingSubcategoryEdit = false;

        const matchInForm = this.subcategories.find(s => s.id === sub.id);
        if (matchInForm) matchInForm.name = updated.name;
        this.subcategories.sort((a, b) => a.name.localeCompare(b.name));

        const matchInAll = this.allSubcategories.find(s => s.id === sub.id);
        if (matchInAll) matchInAll.name = updated.name;

        if (this.product.subcategory === updated.oldName) {
          this.product.subcategory = updated.name;
        }

        this.editingSubcategoryId = null;
        this.editSubcategoryName = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingSubcategoryEdit = false;
        this.subcategoryEditError = err?.error?.error || 'Failed to rename subcategory. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  requestDeleteSubcategory(sub: Subcategory, event: Event) {
    event.stopPropagation();
    this.deleteSubcategoryTarget = sub;
    this.deleteSubcategoryBlockedProducts = null;
    this.deleteSubcategoryError = '';
    this.editingSubcategoryId = null;
    this.addingSubcategory = false;
  }

  cancelDeleteSubcategory() {
    this.deleteSubcategoryTarget = null;
    this.deleteSubcategoryBlockedProducts = null;
    this.deleteSubcategoryError = '';
  }

  confirmDeleteSubcategory(force = false) {
    if (!this.deleteSubcategoryTarget) return;
    const sub = this.deleteSubcategoryTarget;

    this.deletingSubcategory = true;
    this.deleteSubcategoryError = '';

    this.categoryService.deleteSubcategory(sub.id, force).subscribe({
      next: () => {
        this.deletingSubcategory = false;

        this.subcategories = this.subcategories.filter(s => s.id !== sub.id);
        this.allSubcategories = this.allSubcategories.filter(s => s.id !== sub.id);

        if (this.product.subcategory === sub.name) {
          this.product.subcategory = '';
        }

        this.deleteSubcategoryTarget = null;
        this.deleteSubcategoryBlockedProducts = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.deletingSubcategory = false;

        if (err?.status === 409 && err?.error?.inUse) {
          this.deleteSubcategoryBlockedProducts = err.error.products || [];
        } else {
          this.deleteSubcategoryError = err?.error?.error || 'Failed to delete subcategory. Please try again.';
        }
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