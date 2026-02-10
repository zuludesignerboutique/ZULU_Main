import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-card.html',
  styleUrls: ['./product-card.scss']
})
export class ProductCard {
  @Input() product!: Product;

  constructor(
    private cartService: CartService,
    private wishlistService: WishlistService
  ) {}

addedToCart = false;
addedToWishlist = false;

addToCart() {
  this.cartService.add(this.product);
  this.addedToCart = true;
}

addToWishlist() {
  this.wishlistService.add(this.product);
  this.addedToWishlist = true;
}

}
