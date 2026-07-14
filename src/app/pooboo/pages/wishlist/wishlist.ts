import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PoobooCart } from '../../services/pooboo-cart';

@Component({
  selector: 'app-pooboo-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class Wishlist {
  constructor(private poobooCart: PoobooCart) {}
}
