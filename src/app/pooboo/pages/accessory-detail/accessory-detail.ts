import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PoobooHeader } from '../../layout/pooboo-header/pooboo-header';
import { PoobooFooter } from '../../layout/pooboo-footer/pooboo-footer';
import { PoobooAccessoryService } from '../../services/pooboo-accessory.service';
import { PoobooAccessory } from '../../core/models/pooboo-accessory.model';
import { CartService } from '../../../services/cart.service';

@Component({
  selector: 'app-pooboo-accessory-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, PoobooHeader, PoobooFooter],
  templateUrl: './accessory-detail.html',
  styleUrl: './accessory-detail.scss'
})
export class AccessoryDetail implements OnInit {

  private api = '';

  typeMeta: Record<string, { label: string; emoji: string; backLink: string; backLabel: string }> = {
    'baby-ornaments': { label: 'Baby Ornaments', emoji: '🌟', backLink: '/pooboo/accessories/baby-ornaments', backLabel: 'Baby Ornaments' },
    'bands':          { label: 'Bands',          emoji: '💛', backLink: '/pooboo/accessories/bands',         backLabel: 'Bands' },
    'hair-clips':      { label: 'Hair Clips',     emoji: '🩷', backLink: '/pooboo/accessories/hair-clips',    backLabel: 'Hair Clips' },
  };

  product: PoobooAccessory | null = null;
  loading = true;
  error   = '';
  addedToCart = false;

  constructor(
    private accessoryService: PoobooAccessoryService,
    private route : ActivatedRoute,
    private router: Router,
    private cdr   : ChangeDetectorRef,
    private cartService: CartService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.accessoryService.getById(id).subscribe({
      next: (data) => {
        this.product = data;
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

  get meta() {
    return this.product ? this.typeMeta[this.product.accessory_type] : null;
  }

  isOutOfStock(): boolean {
    return this.product?.stock === 0;
  }

  getImageUrl(img: string | null): string {
    if (!img) return 'assets/images/placeholder.jpg';
    return img.startsWith('http') ? img : `${this.api}/uploads/${img}`;
  }

  // ✅ brand: 'pooboo' keeps this separate from any ZULU product sharing the same numeric id
  addToCart() {
    if (!this.product || this.isOutOfStock()) return;
    this.cartService.add(
      {
        id: this.product.id,
        name: this.product.name,
        description: this.product.description,
        price: this.product.price,
        image_url: this.product.image_url,
        brand: 'pooboo',
        product_type: 'accessory',
        product_code: this.product.product_code || ''
      } as any,
      undefined,
      1
    );
    this.addedToCart = true;
    setTimeout(() => (this.addedToCart = false), 2000);
  }

  goToEnquiry() {
  this.router.navigate(['/pooboo/enquiry'], {
    queryParams: {
      productName:     this.product?.name,
      productCode:     this.product?.product_code || '',
      productPrice:    `₹${this.product?.price}`,
      productCategory: this.meta?.label ?? ''
    }
  });
}

// Deep-links to the shared reviews page, pre-filled with this accessory's
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
    this.router.navigate([this.meta?.backLink ?? '/pooboo/accessories']);
  }
}