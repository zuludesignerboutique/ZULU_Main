import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-edit-product',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './edit-product.html',
  styleUrl: './edit-product.scss'
})
export class EditProduct implements OnInit {

  product: any = {};

  // ✅ ADD THIS
  selectedFile!: File;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(){

    const id = this.route.snapshot.params['id'];

    // Get all products and find one
    this.http.get<any[]>('http://localhost:4000/api/products')
    .subscribe(data => {

      this.product = data.find(p => p.id == id);

    });

  }

  // ✅ ADD THIS FUNCTION (fix error)
  onFileSelect(event: any){
    this.selectedFile = event.target.files[0];
  }

  updateProduct(){

    // ✅ USE FORMDATA (IMPORTANT)
   const formData = new FormData();

formData.append('name', this.product.name || '');
formData.append('description', this.product.description || '');
formData.append('price', this.product.price || 0);
formData.append('category', this.product.category || '');
formData.append('subcategory', this.product.subcategory || '');
formData.append('stock', this.product.stock ? this.product.stock.toString() : '0');

    // ✅ only if new image selected
    if(this.selectedFile){
      formData.append('image', this.selectedFile);
    }

    this.http.put(
      `http://localhost:4000/api/products/${this.product.id}`,
      formData
    ).subscribe(() => {

      alert("Product updated");

      this.router.navigate(['/admin/products']);

    });

  }

}