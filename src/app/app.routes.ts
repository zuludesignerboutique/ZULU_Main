import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { Products } from './pages/products/products';
import { ProductDetailsComponent } from './pages/product-details/product-details';
import { Gallery } from './pages/gallery/gallery';
import { Reviews } from './pages/reviews/reviews';
import { Contact } from './pages/contact/contact';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'products', component: Products },
  { path: 'products/:id', component: ProductDetailsComponent },
  { path: 'gallery', component: Gallery },
  { path: 'reviews', component: Reviews },
  { path: 'contact', component: Contact },
  { path: '**', redirectTo: '' },
  {
  path: 'reviews',
  loadComponent: () =>
    import('./pages/reviews/reviews').then(m => m.Reviews)
}
];
