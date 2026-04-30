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
import { Wishlist } from './pages/wishlist/wishlist';
import { authGuard } from './guards/auth.guard';
import { CategoryLandingComponent } from './pages/category-landing/category-landing';
import { CategoriesComponent } from './pages/categories/categories';
import { SubcategoriesComponent } from './pages/subcategories/subcategories';
import { adminGuard } from './admin/admin-guard';
export const routes: Routes = [

  // { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '', component: CategoryLandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },

  
{ path: 'home', component: HomeComponent },
{ path: 'products', component: Products },
{ path: 'gallery', component: Gallery },
{ path: 'reviews', component: Reviews, runGuardsAndResolvers: 'always' },
{ path: 'contact', component: Contact },

{ path: 'categories', component: CategoriesComponent },
{ path: 'categories/:type', component: SubcategoriesComponent },

// admin login


{
  path: 'admin',
  loadComponent: () =>
    import('./admin/admin-layout/admin-layout').then(m => m.AdminLayoutComponent),
  canActivate: [adminGuard],
  children: [

    {
      path: 'dashboard',
      loadComponent: () =>
        import('./admin/admin-dashboard/admin-dashboard').then(m => m.AdminDashboard)
    },
    {
      path: 'products',
      loadComponent: () =>
        import('./admin/admin-products/admin-products').then(m => m.AdminProducts)
    },
    {
      path: 'add-product',
      loadComponent: () =>
        import('./admin/add-product/add-product').then(m => m.AddProduct)
    },
    {
      path: 'edit-product/:id',
      loadComponent: () =>
        import('./admin/edit-product/edit-product').then(m => m.EditProduct)
    }

  ]
},
{
  path: 'product/:id',
  loadComponent: () =>
    import('./pages/product-view/product-view').then(m => m.ProductView)
},

{ path: 'cart', component: CartComponent, canActivate: [authGuard] },
{ path: 'wishlist', component: Wishlist, canActivate: [authGuard] },

   { path: 'shipping-policy', component: ShippingPolicy },
  { path: 'privacy-policy', component: PrivacyPolicy },
  { path: 'terms-conditions', component: TermsConditions },
  { path: 'about-zora', component: AboutZora },
  { path: 'returns-exchange', component: ReturnsExchange },

  { path: '**', redirectTo: '' }
];
