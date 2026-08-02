import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WishlistService, WishlistItem } from '../../services/wishlist.service';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './wishlist.html',
  styleUrls: ['./wishlist.scss']
})
export class Wishlist implements OnInit {

  wishlist: WishlistItem[] = [];
  isLoading = true;

  constructor(
    private wishlistService: WishlistService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Always refresh (not ensureLoaded) — this page should always show the
    // current backend state, not a stale cached snapshot from a product-card
    this.wishlistService.refresh();
    this.wishlistService.items$.subscribe(items => {
      this.ngZone.run(() => {
        this.wishlist = items;
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    });
  }

  remove(item: WishlistItem) {
    this.wishlistService.remove(item.item_type, item.item_id);
  }

  // ✅ Builds the right route per item type — POOBOO accessories are nested
  // under their category (baby-ornaments/bands/hair-clips), everything else
  // is a flat /:id route
  getViewLink(item: WishlistItem): string[] {
    switch (item.item_type) {
      case 'zulu_product':
        return ['/product', String(item.item_id)];
      case 'pooboo_product':
        return ['/pooboo/products', String(item.item_id)];
      case 'pooboo_fabric':
        return ['/pooboo/fabrics', String(item.item_id)];
      case 'pooboo_accessory':
        return item.category
          ? ['/pooboo/accessories', item.category, String(item.item_id)]
          : ['/pooboo/accessories'];
      default:
        return ['/'];
    }
  }

  // ✅ Friendly brand/type label for the card
  getTypeLabel(item: WishlistItem): string {
    const map: Record<string, string> = {
      zulu_product: 'ZULU',
      pooboo_product: 'POOBOO · Apparel',
      pooboo_fabric: 'POOBOO · Fabric',
      pooboo_accessory: 'POOBOO · Accessory'
    };
    return map[item.item_type] || '';
  }
}