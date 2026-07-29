import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { GalleryImage } from '../core/models/gallery.model';

@Injectable({
  providedIn: 'root'
})
export class GalleryService {

  constructor() {}

  getGalleryImages(): Observable<GalleryImage[]> {
  return of([
    {
      id: 1,
      title: 'Elegant Bridal Look',
      imageUrl: 'assets/images/1 b.jpeg'
    },
    {
      id: 2,
      title: 'Classic White Gown',
      imageUrl: 'assets/images/2 B.jpeg'
    },
    {
      id: 3,
      title: 'Royal Lace Design',
      imageUrl: 'assets/images/3 B.jpeg'
    },
    {
      id: 4,
      title: 'Modern Wedding Style',
      imageUrl: 'assets/images/4 B.jpeg'
    },
    {
      id: 5,
      title: 'Luxury Bridal Wear',
      imageUrl: 'assets/images/5 B.jpeg'
    },
    {
      id: 6,
      title: 'Minimalist Elegance',
      imageUrl: 'assets/images/6 B.jpeg'
    },
    {
      id: 7,
      title: 'Traditional Bridal Look',
      imageUrl: 'assets/images/7 B.jpeg'
    },
    {
      id: 8,
      title: 'Designer Wedding Gown',
      imageUrl: 'assets/images/8B.jpeg'
    },
    {
      id: 9,
      title: 'Soft Pastel Collection',
      imageUrl: 'assets/images/9 B.jpeg'
    },
    {
      id: 10,
      title: 'Pink Elegance',
      imageUrl: 'assets/images/10 B.jpeg'
    }
  ]);
}
}
