import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.scss'
})
export class AdminProducts implements OnInit {

  products: any[] = [];

  // Search — filters the already-loaded list client-side by name or product code
  searchQuery = '';

  get filteredProducts(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.products;
    return this.products.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.product_code || '').toLowerCase().includes(q)
    );
  }

  clearSearch() {
    this.searchQuery = '';
  }

  constructor(
    private productService: ProductService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private toast: ToastService
  ){}

async deleteProduct(id: number){
  const confirmed = await this.toast.confirm({
    title: 'Delete product?',
    message: 'Are you sure? This cannot be undone.',
    confirmLabel: 'Delete'
  });
  if (!confirmed) return;
  this.http.delete(`/api/products/${id}`)
    .subscribe(() => {
      this.products = this.products.filter(p => p.id !== id);
      this.toast.success('Product deleted successfully!');
    });
}

  ngOnInit(){
    // This is the ZULU-only admin products list (separate from the
    // POOBOO admin section) — scope it to brand=zulu, or Pooboo's
    // apparel/fabric/accessory rows leak in since they all live in
    // the same unified `products` table now.
    this.http.get<any[]>('/api/products/all', { params: { brand: 'zulu' } })
      .subscribe((data: any[]) => {
        console.log("Admin Products:", data);
        this.products = data;

        this.cdr.detectChanges();
      });
  }



  trackById(index: number, item: any) {
    return item.id;
  }

}