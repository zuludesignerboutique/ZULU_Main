import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProductCard } from '../../components/product-card/product-card';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ProductCard],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomeComponent {

  products = [
  {
    id: 1,
    name: 'ZORA Dress',
    price: 2499,
    image: 'assets/images/beautiful-bride-white-dress-crown-his-head-park-holding-bouquet.jpg',
    category: 'bridal'
  },
  {
    id: 2,
    name: 'Ivory Bridal Gown',
    price: 3199,
    image: 'assets/images/bridal2.jpg',
    category: 'bridal'
  },
  {
    id: 3,
    name: 'Classic White Elegance',
    price: 2899,
    image: 'assets/images/bridal3.jpg',
    category: 'bridal'
  },
  {
    id: 4,
    name: 'Royal Lace Dress',
    price: 3499,
    image: 'assets/images/bridal4.jpg',
    category: 'bridal'
  }
];
}
