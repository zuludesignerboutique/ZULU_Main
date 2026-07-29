import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PoobooHeader } from '../../layout/pooboo-header/pooboo-header';
import { PoobooFooter } from '../../layout/pooboo-footer/pooboo-footer';
import { PoobooFabricService } from '../../services/pooboo-fabric.service';
import { PoobooFabric } from '../../core/models/pooboo-fabric.model';

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

  constructor(
    private fabricService: PoobooFabricService,
    private route : ActivatedRoute,
    private router: Router,
    private cdr   : ChangeDetectorRef
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

  goBack() {
    this.router.navigate(['/pooboo/fabrics']);
  }
}