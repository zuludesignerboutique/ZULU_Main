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
  selectedAgeGroup = '';
  sizeError = false;
  ageError = false;
  addedToCart    = false;

  // Gallery state — mirrors ZULU's product-view thumbnail-strip pattern.
  // Keeps { image_url, label } objects (not plain strings) so thumbnail
  // badges can show the admin-entered label like ZULU does.
  galleryImages  : any[] = [];
  selectedImage: any = null;

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
        // normalize age_groups: array from new column, fallback to legacy single
        if (!Array.isArray(this.product.age_groups) || !this.product.age_groups.length) {
          if (this.product.age_group) this.product.age_groups = [String(this.product.age_group)];
          else this.product.age_groups = [];
        }
        // Build the gallery list from product.images[] (new multi-image table),
        // falling back to the legacy single image_url if no gallery rows exist.
        // Keep label alongside image_url so thumbnails can badge it (ZULU parity).
        if (Array.isArray(this.product.images) && this.product.images.length) {
          this.galleryImages = this.product.images
            .slice()
            .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
            .map((img: any) => ({ image_url: img.image_url, label: img.label || '' }));
        } else if (this.product.image_url) {
          this.galleryImages = [{ image_url: this.product.image_url, label: '' }];
        } else {
          this.galleryImages = [];
        }
        this.selectedImage = this.galleryImages[0] || null;
        // Auto-select only if single option (strict >1 enforcement)
        if (data.sizes?.length === 1) this.selectedSize = data.sizes[0];
        else this.selectedSize = '';
        if (this.product.age_groups?.length === 1) this.selectedAgeGroup = this.product.age_groups[0];
        else this.selectedAgeGroup = '';
        if (data.colours?.length) this.selectedColour = data.colours[0];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.log('Error:', err);
        this.error   = 'Failed to load product.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getImageUrl(img: string | any | null): string {
    const url = typeof img === 'string' ? img : img?.image_url;
    if (!url) return 'assets/images/placeholder.png';
    return url.startsWith('http') ? url : `${this.api}/uploads/${url}`;
  }

  selectImage(img: any) { this.selectedImage = img; this.cdr.detectChanges(); }

  isActiveImage(img: any): boolean {
    return (this.selectedImage?.image_url || this.galleryImages[0]?.image_url) === img?.image_url;
  }

  selectSize(s: string) { this.selectedSize = s; this.sizeError = false; this.cdr.detectChanges(); }
  selectAge(a: string) { this.selectedAgeGroup = a; this.ageError = false; this.cdr.detectChanges(); }
  selectColour(c: string) { this.selectedColour = c; this.cdr.detectChanges(); }

  addToCart() {
    if (!this.product) return;
    const sizes = this.product.sizes || [];
    const ageGroups = this.product.age_groups || [];
    // strict >1 enforcement per user request
    if (sizes.length > 1 && !this.selectedSize) { this.sizeError = true; this.cdr.detectChanges(); return; }
    if (ageGroups.length > 1 && !this.selectedAgeGroup) { this.ageError = true; this.cdr.detectChanges(); return; }
    this.sizeError = false; this.ageError = false;
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