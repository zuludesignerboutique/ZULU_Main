import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductCardComponent } from '../../components/product-card/product-card';

interface Product {
  id:       number;
  name:     string;
  price:    number;
  image:    string;
  category: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomeComponent {

  products: Product[] = [
    {
      id:       1,
      name:     'ZORA Dress',
      price:    6799,
      image:    'assets/images/beautiful-bride-white-dress-crown-his-head-park-holding-bouquet.jpg',
      category: 'bridal'
    },
    {
      id:       2,
      name:     'Party Wear',
      price:    4999,
      image:    'assets/images/party wear.jpeg',
      category: 'party'
    },
    {
      id:       3,
      name:     'Ethnic Saree',
      price:    2899,
      image:    'assets/images/saree 2.jpg',
      category: 'ethnic'
    },
    {
      id:       4,
      name:     'Royal Lace Dress',
      price:    5499,
      image:    'assets/images/redlace.jpg',
      category: 'bridal'
    }
  ];
}