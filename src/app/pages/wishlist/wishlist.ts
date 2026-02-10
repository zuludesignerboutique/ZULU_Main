import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WishlistService } from '../../services/wishlist.service';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wishlist.html',
  styleUrls: ['./wishlist.scss']
})
export class WishlistComponent {
  wishlist: Product[] = [];

  constructor(private wishlistService: WishlistService) {
    this.wishlist = this.wishlistService.getAll();
  }

  remove(id: number) {
    this.wishlistService.remove(id);
    this.wishlist = this.wishlistService.getAll();
  }
}
