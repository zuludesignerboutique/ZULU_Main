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
    this.http.delete(`http://localhost:4000/api/products/${id}`)
      .subscribe(() => {
        this.products = this.products.filter(p => p.id !== id);
      });
  }
}
  ngOnInit(){
    this.http.get<any[]>('http://localhost:4000/api/products')
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