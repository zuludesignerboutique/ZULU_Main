import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PoobooHeader } from '../../layout/pooboo-header/pooboo-header';
import { PoobooFooter } from '../../layout/pooboo-footer/pooboo-footer';
import { CartService } from '../../../services/cart.service';
@Component({
  selector: 'app-pooboo-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, PoobooHeader, PoobooFooter],
  templateUrl: './pooboo-product-detail.html',
  styleUrl: './pooboo-product-detail.scss'
})
export class PoobooProductDetail implements OnInit {

  private api = '';

  product        : any = null;
  loading        = true;
  error          = '';
  selectedSize   = '';
  selectedColour = '';
  addedToCart    = false;

  constructor(
    private http  : HttpClient,
    private route : ActivatedRoute,
    private router: Router,
    private cdr   : ChangeDetectorRef,
    private cartService: CartService
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

  // ✅ Pooboo product tables are separate from ZULU's, so items are tagged brand: 'pooboo'
  // to avoid id collisions once they land in the shared cart (see CartService)
  addToCart() {
    if (!this.product) return;
    this.cartService.add(
      {
        id: this.product.id,
        name: this.product.name,
        description: this.product.description,
        price: this.product.price,
        image_url: this.product.image_url,
        brand: 'pooboo',
        product_type: 'apparel',
        product_code: this.product.product_code || '',
        colour: this.selectedColour || undefined
      } as any,
      this.selectedSize || undefined,
      1
    );
    this.addedToCart = true;
    setTimeout(() => (this.addedToCart = false), 2000);
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

// Deep-links to the shared reviews page, pre-filled with this product's
// context and set to auto-open the write-review form (write=1). brand=pooboo
// tells the shared page which store the review belongs to.
goToWriteReview() {
  if (!this.product) return;
  this.router.navigate(['/reviews'], {
    queryParams: {
      brand:       'pooboo',
      productId:   this.product.id,
      productName: this.product.name,
      write:       1
    }
  });
}

  goBack() {
    this.router.navigate(['/pooboo/products']);
  }
}