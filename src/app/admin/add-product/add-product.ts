import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './add-product.html',
  styleUrl: './add-product.scss'
})
export class AddProduct {

  product: any = {
    name: '',
    description: '',
    price: 0,
    category: '',
    subcategory: '',
    stock: 0
  };

  selectedFile!: File;

  constructor(private http: HttpClient, private router: Router) {}

  // 📌 handle file select
  onFileSelect(event: any){
    this.selectedFile = event.target.files[0];
  }

  // ❌ REMOVE ngOnInit (not needed here)
  // ngOnInit(){...}

  addProduct(){

    console.log("Button clicked", this.product);

    const formData = new FormData();

    formData.append('name', this.product.name);
    formData.append('description', this.product.description);
    formData.append('price', this.product.price.toString());
    formData.append('category', this.product.category);
    formData.append('subcategory', this.product.subcategory);
    formData.append('stock', this.product.stock.toString());

    if(this.selectedFile){
      formData.append('image', this.selectedFile);
    }

    this.http.post('http://localhost:4000/api/products', formData)
    .subscribe(res => {

      alert("Product added successfully");

      // ✅ reset form (small UX improvement)
      this.product = {
        name: '',
        description: '',
        price: 0,
        category: '',
        subcategory: '',
        stock: 0
      };
      this.selectedFile = undefined as any;

      this.router.navigate(['/admin/products']);

    });

  }

}