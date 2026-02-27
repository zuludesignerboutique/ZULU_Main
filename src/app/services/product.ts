import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  products = [
    {
      id: 1,
      name: 'ZORA Dress',
      price: 6799,
      image: 'assets/images/beautiful-bride-white-dress-crown-his-head-park-holding-bouquet.jpg',
      description: 'A beautiful white bridal gown perfect for weddings and special ceremonies.'
    },
    {
    id: 2,
    name: 'Party wear',
    price: 4999,
    image: 'assets/images/party wear.jpeg',
    description: 'A charming lite pink party wear dress crafted for a stylish and elegant look. Ideal for celebrations and evening gatherings.'
  },
  {
    id: 3,
    name: 'Ethnic Saree',
    price: 2899,
    image: 'assets/images/saree 2.jpg',
    description: 'An elegant ethnic saree with rich embroidery, perfect for festive occasions.'
  },
  {
    id: 4,
    name: 'Royal Lace Dress',
    price: 5499,
    image: 'assets/images/redlace.jpg',
    description: 'A stunning royal red lace dress with rich gold detailing on the neckline, designed to make you stand out at festive and special events.'
  }
  ];

  getProducts() {
    return this.products;
  }

  getProductById(id: number) {
    return this.products.find(p => p.id === id);
  }
}
