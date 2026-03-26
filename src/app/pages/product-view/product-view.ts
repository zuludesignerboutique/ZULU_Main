import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-view.html',
  styleUrl: './product-view.scss'
})
export class ProductView implements OnInit {

  product: any;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

 ngOnInit(){
  const id = this.route.snapshot.params['id'];

  console.log("🔥 NEW PRODUCT PAGE LOADED, ID:", id);

  this.http.get(`http://localhost:4000/api/products/${id}`)
    .subscribe(data => {
      this.product = data;
    });
}

  }

