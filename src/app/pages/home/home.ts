import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '../../components/product-card/product-card';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomeComponent {

  products = [
  {
    id: 1,
    name: 'ZORA Dress',
    price: 6799,
    image: 'assets/images/beautiful-bride-white-dress-crown-his-head-park-holding-bouquet.jpg',
    category: 'bridal'
  },
  {
    id: 2,
    name: 'Party wear',
    price: 4999,
    image: 'assets/images/party wear.jpeg',
    category: 'bridal'
  },
  {
    id: 3,
    name: 'Ethnic Saree',
    price: 2899,
    image: 'assets/images/saree 2.jpg',
    category: 'bridal'
  },
  {
    id: 4,
    name: 'Royal Lace Dress',
    price: 5499,
    image: 'assets/images/redlace.jpg',
    category: 'bridal'
  }
];
}
