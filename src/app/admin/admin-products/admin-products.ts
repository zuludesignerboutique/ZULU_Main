import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.scss'
})
export class AdminProducts implements OnInit {

  products: any[] = [];

  constructor(
    private productService: ProductService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ){}

deleteProduct(id: number){
  if(confirm("Are you sure?")){
    this.http.delete(`/api/products/${id}`)
      .subscribe(() => {
        this.products = this.products.filter(p => p.id !== id);
      });
  }
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