import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product } from '../core/models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private products: Product[] = [
    {
      id: 1,
      name: 'Bridal Silk Saree',
      price: 12999,
      image: 'assets/images/saree-look.jpg',
      category: 'Bridal',
      description: 'Premium handcrafted bridal silk saree',
      createdAt: new Date()
    },
    {
      id: 2,
      name: 'Designer Lehenga',
      price: 18999,
      image: 'assets/products/lehenga1.jpg',
      category: 'Designer',
      description: 'Elegant designer lehenga for weddings',
      createdAt: new Date()
    },
    {
    id: 3,
    name: 'Party Wear Gown',
    price: 9999,
    image: 'assets/products/gown1.jpg',
    category: 'Party Wear',
    description: 'Stylish party wear gown with premium finish',
    createdAt: new Date()
  },
  {
    id: 4,
    name: 'Casual Kurti Set',
    price: 3499,
    image: 'assets/products/kurti1.jpg',
    category: 'Casual',
    description: 'Comfortable and elegant daily wear kurti set',
    createdAt: new Date()
  },
  {
    id: 5,
    name: 'Wedding Anarkali',
    price: 11499,
    image: 'assets/products/anarkali1.jpg',
    category: 'Wedding',
    description: 'Royal wedding Anarkali with detailed embroidery',
    createdAt: new Date()
  },
  {
    id: 6,
    name: 'Designer Blouse',
    price: 2999,
    image: 'assets/products/blouse1.jpg',
    category: 'Designer',
    description: 'Trendy designer blouse with modern cuts',
    createdAt: new Date()
  }
  ];

  private productSubject = new BehaviorSubject<Product[]>(this.products);

  getProducts(): Observable<Product[]> {
    return this.productSubject.asObservable();
  }

}
