import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PoobooHeader } from '../../layout/pooboo-header/pooboo-header';
import { PoobooFooter } from '../../layout/pooboo-footer/pooboo-footer';
import { PoobooFabricService } from '../../services/pooboo-fabric.service';
import { PoobooFabric } from '../../core/models/pooboo-fabric.model';
import { CartService } from '../../../services/cart.service';

@Component({
  selector: 'app-pooboo-fabric-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, PoobooHeader, PoobooFooter],
  templateUrl: './fabric-detail.html',
  styleUrl: './fabric-detail.scss'
})
export class FabricDetail implements OnInit {

  private api = '';

  fabricTypes = [
    { label: 'Cotton',    value: 'cotton',    emoji: '🌿' },
    { label: 'Silk',      value: 'silk',      emoji: '✨' },
    { label: 'Linen',     value: 'linen',     emoji: '🍃' },
    { label: 'Georgette', value: 'georgette', emoji: '🌸' },
    { label: 'Net',       value: 'net',       emoji: '🕸️' },
    { label: 'Velvet',    value: 'velvet',    emoji: '💜' },
    { label: 'Satin',     value: 'satin',     emoji: '💫' },
  ];

  product: PoobooFabric | null = null;
  loading = true;
  error   = '';
  addedToCart = false;

  constructor(
    private fabricService: PoobooFabricService,
    private route : ActivatedRoute,
    private router: Router,
    private cdr   : ChangeDetectorRef,
    private cartService: CartService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.fabricService.getById(id).subscribe({
      next: (data) => {
        this.product = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.log('Error:', err);
        this.error   = 'Failed to load fabric.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getTypeLabel(value: string): string {
    const t = this.fabricTypes.find(t => t.value === value);
    return t ? `${t.emoji} ${t.label}` : value;
  }

  // Plain text version (no emoji) — safe for query params / WhatsApp text
  getPlainTypeLabel(value: string): string {
    const t = this.fabricTypes.find(t => t.value === value);
    return t ? t.label : value;
  }

  getImageUrl(img: string | null): string {
    if (!img) return 'assets/images/placeholder.png';
    return img.startsWith('http') ? img : `${this.api}/uploads/${img}`;
  }

  // ✅ price_per_meter maps into the cart's `price` field. No size is passed —
  // there's no meter-quantity selector on this page yet, so qty defaults to 1 "unit".
  // brand: 'pooboo' keeps this separate from any ZULU product sharing the same numeric id.
  addToCart() {
    if (!this.product) return;
    this.cartService.add(
      {
        id: this.product.id,
        name: this.product.name,
        description: this.product.description,
        price: this.product.price_per_meter,
        image_url: this.product.image_url,
        brand: 'pooboo',
        product_type: 'fabric',
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
        productPrice:    `₹${this.product?.price_per_meter}/meter`,
        productCategory: this.getPlainTypeLabel(this.product?.fabric_type ?? '')
      }
    });
  }

  // Deep-links to the shared reviews page, pre-filled with this fabric's
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
    this.router.navigate(['/pooboo/fabrics']);
  }
}