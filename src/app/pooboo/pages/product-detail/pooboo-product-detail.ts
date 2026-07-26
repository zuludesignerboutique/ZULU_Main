import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PoobooHeader } from '../../layout/pooboo-header/pooboo-header';
import { PoobooFooter } from '../../layout/pooboo-footer/pooboo-footer';
@Component({
  selector: 'app-pooboo-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, PoobooHeader, PoobooFooter],
  templateUrl: './pooboo-product-detail.html',
  styleUrl: './pooboo-product-detail.scss'
})
export class PoobooProductDetail implements OnInit {

  private api = 'http://localhost:4000';

  product        : any = null;
  loading        = true;
  error          = '';
  selectedSize   = '';
  selectedColour = '';

  constructor(
    private http  : HttpClient,
    private route : ActivatedRoute,
    private router: Router,
    private cdr   : ChangeDetectorRef
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    this.http.get<any>(`${this.api}/api/pooboo/products/${id}`).subscribe({
      next: (data) => {
        this.product       = data;
        if (data.sizes?.length)   this.selectedSize   = data.sizes[0];
        if (data.colours?.length) this.selectedColour = data.colours[0];
        this.loading = false;
        this.cdr.detectChanges(); // ← forces Angular to re-render
      },
      error: (err) => {
        console.log('Error:', err);
        this.error   = 'Failed to load product.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getImageUrl(img: string | null): string {
    if (!img) return 'assets/images/placeholder.png';
    return img.startsWith('http') ? img : `${this.api}/uploads/${img}`;
  }

goToEnquiry() {
  this.router.navigate(['/pooboo/enquiry'], {
    queryParams: {
      productName:     this.product.name,
      productCode:     this.product.product_code || '',
      productPrice:    `₹${this.product.price}`,
      productCategory: this.product.category || 'Kids Wear'
    }
  });
}

  goBack() {
    this.router.navigate(['/pooboo/products']);
  }
}