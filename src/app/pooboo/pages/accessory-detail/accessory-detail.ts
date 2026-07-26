import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PoobooHeader } from '../../layout/pooboo-header/pooboo-header';
import { PoobooFooter } from '../../layout/pooboo-footer/pooboo-footer';
import { PoobooAccessoryService } from '../../services/pooboo-accessory.service';
import { PoobooAccessory } from '../../core/models/pooboo-accessory.model';

@Component({
  selector: 'app-pooboo-accessory-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, PoobooHeader, PoobooFooter],
  templateUrl: './accessory-detail.html',
  styleUrl: './accessory-detail.scss'
})
export class AccessoryDetail implements OnInit {

  private api = 'http://localhost:4000';

  typeMeta: Record<string, { label: string; emoji: string; backLink: string; backLabel: string }> = {
    'baby-ornaments': { label: 'Baby Ornaments', emoji: '🌟', backLink: '/pooboo/accessories/baby-ornaments', backLabel: 'Baby Ornaments' },
    'bands':          { label: 'Bands',          emoji: '💛', backLink: '/pooboo/accessories/bands',         backLabel: 'Bands' },
    'hair-clips':      { label: 'Hair Clips',     emoji: '🩷', backLink: '/pooboo/accessories/hair-clips',    backLabel: 'Hair Clips' },
  };

  product: PoobooAccessory | null = null;
  loading = true;
  error   = '';

  constructor(
    private accessoryService: PoobooAccessoryService,
    private route : ActivatedRoute,
    private router: Router,
    private cdr   : ChangeDetectorRef
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

  goBack() {
    this.router.navigate([this.meta?.backLink ?? '/pooboo/accessories']);
  }
}