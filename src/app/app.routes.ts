import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { Products } from './pages/products/products';
import { ProductDetailsComponent } from './pages/product-details/product-details';
import { Gallery } from './pages/gallery/gallery';
import { Reviews } from './pages/reviews/reviews';
import { Contact } from './pages/contact/contact';
import { PrivacyPolicy } from './pages/privacy-policy/privacy-policy';
import { TermsConditions } from './pages/terms-conditions/terms-conditions';
import { ShippingPolicy } from './pages/shipping-policy/shipping-policy';
import { AboutZora } from './pages/about-zora/about-zora';
import { ReturnsExchange } from './pages/returns-exchange/returns-exchange';
import { LoginComponent } from './pages/login/login';
import { SignupComponent } from './pages/signup/signup';
import { CartComponent } from './pages/cart/cart';
import { WishlistComponent } from './pages/wishlist/wishlist';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },

{ path: 'home', component: HomeComponent, canActivate: [authGuard] },
{ path: 'products', component: Products, canActivate: [authGuard] },
{ path: 'gallery', component: Gallery, canActivate: [authGuard] },
{ path: 'reviews', component: Reviews, canActivate: [authGuard] },
{ path: 'contact', component: Contact, canActivate: [authGuard] },
{ path: 'cart', component: CartComponent, canActivate: [authGuard] },
{ path: 'wishlist', component: WishlistComponent, canActivate: [authGuard] },
{ path: 'products/:id', component: ProductDetailsComponent, canActivate: [authGuard] },

   { path: 'shipping-policy', component: ShippingPolicy },
  { path: 'privacy-policy', component: PrivacyPolicy },
  { path: 'terms-conditions', component: TermsConditions },
  { path: 'about-zora', component: AboutZora },
  { path: 'returns-exchange', component: ReturnsExchange },

  { path: '**', redirectTo: 'login' }
];
