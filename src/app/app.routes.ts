import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { Products } from './pages/products/products';
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
import { Categories } from './pages/categories/categories';
import { SubcategoriesComponent } from './pages/subcategories/subcategories';
import { Checkout } from './pages/checkout/checkout';
import { OrderSuccessComponent } from './pages/order-success/order-success';
import { OrderHistoryComponent } from './pages/order-history/order-history';
import { adminGuard } from './admin/admin-guard';
import { UserDashboard } from './pages/user-dashboard/user-dashboard';
import { DashboardShell } from './pages/dashboard-shell/dashboard-shell';

export const routes: Routes = [

  // ── Store selector ─────────────────────────────
  { path: '', component: CategoryLandingComponent },

  // ── Auth ───────────────────────────────────────
  { path: 'login',  component: LoginComponent },
  { path: 'signup', component: SignupComponent },

  // ── ZULU routes ────────────────────────────────
  { path: 'home',     component: HomeComponent },
  { path: 'products', component: Products },
  { path: 'gallery',  component: Gallery },
  { path: 'reviews',  component: Reviews, runGuardsAndResolvers: 'always' },
  { path: 'contact',  component: Contact },

  { path: 'categories',       component: Categories },
  { path: 'categories/:type', component: SubcategoriesComponent },

  { path: 'cart',          component: CartComponent,         canActivate: [authGuard] },
  { path: 'wishlist',      component: Wishlist,              canActivate: [authGuard] },
  { path: 'checkout',      component: Checkout,              canActivate: [authGuard] },
  { path: 'order-history', component: OrderHistoryComponent, canActivate: [authGuard] },
  { path: 'order-success', component: OrderSuccessComponent },
  {
    path: 'dashboard',
    component: DashboardShell,
    canActivate: [authGuard],
    children: [
      { path: '',              component: UserDashboard },
      { path: 'cart',          component: CartComponent },
      { path: 'wishlist',      component: Wishlist },
      { path: 'order-history', component: OrderHistoryComponent },
    ]
  },
  {
    path: 'product/:id',
    loadComponent: () =>
      import('./pages/product-view/product-view').then(m => m.ProductView)
  },

  // ── Admin (lazy + guarded) ─────────────────────
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
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./admin/admin-orders/admin-orders').then(m => m.AdminOrders)
      },
      {
        path: 'stock',
        loadComponent: () =>
          import('./admin/admin-stock/admin-stock').then(m => m.AdminStock)
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./admin/admin-transactions/admin-transactions').then(m => m.AdminTransactions)
      },
      {
        path: 'gallery',
        loadComponent: () =>
          import('./admin/admin-gallery/admin-gallery').then(m => m.AdminGallery)
      },
      // ── POOBOO admin ───────────────────────────
      {
        path: 'pooboo/products',
        loadComponent: () =>
          import('./pooboo/admin/pooboo-admin-products/pooboo-admin-products')
            .then(m => m.PoobooAdminProducts)
      },
      {
        path: 'pooboo/add-product',
        loadComponent: () =>
          import('./pooboo/admin/pooboo-add-product/pooboo-add-product')
            .then(m => m.PoobooAddProduct)
      },
      {
        path: 'pooboo/edit-product/:id',
        loadComponent: () =>
          import('./pooboo/admin/pooboo-edit-product/pooboo-edit-product')
            .then(m => m.PoobooEditProduct)
      },
      {
        path: 'pooboo/enquiries',
        loadComponent: () =>
          import('./pooboo/admin/pooboo-admin-enquiries/pooboo-admin-enquiries')
            .then(m => m.PoobooAdminEnquiries)
      },
      {
        path: 'pooboo/fabrics',
        loadComponent: () =>
          import('./pooboo/admin/pooboo-admin-fabrics/pooboo-admin-fabrics')
            .then(m => m.PoobooAdminFabrics)
      },
      {
        path: 'pooboo/accessories',
        loadComponent: () =>
          import('./pooboo/admin/pooboo-admin-accessories/pooboo-admin-accessories')
            .then(m => m.PoobooAdminAccessories)
      },
      {
        path: 'pooboo/edit-fabric/:id',
        loadComponent: () =>
          import('./pooboo/admin/pooboo-edit-fabric/pooboo-edit-fabric')
            .then(m => m.PoobooEditFabric)
      },
      {
        path: 'pooboo/edit-accessory/:id',
        loadComponent: () =>
          import('./pooboo/admin/pooboo-edit-accessory/pooboo-edit-accessory')
            .then(m => m.PoobooEditAccessory)
      },
      {
        path: 'pooboo/reviews',
        loadComponent: () =>
          import('./pooboo/admin/pooboo-admin-reviews/pooboo-admin-reviews')
            .then(m => m.PoobooAdminReviews)
      }
    ]
  },

  // ── ZULU static pages ──────────────────────────
  { path: 'shipping-policy',  component: ShippingPolicy },
  { path: 'privacy-policy',   component: PrivacyPolicy },
  { path: 'terms-conditions', component: TermsConditions },
  { path: 'about-zora',       component: AboutZora },
  { path: 'returns-exchange', component: ReturnsExchange },

  // ── POOBOO storefront (lazy) ───────────────────
  {
    path: 'pooboo',
    loadComponent: () =>
      import('./pooboo/pages/home/pooboo-home').then(m => m.PoobooHome)
  },
  {
    path: 'pooboo/products',
    loadComponent: () =>
      import('./pooboo/pages/products/pooboo-products').then(m => m.PoobooProducts)
  },
  {
    path: 'pooboo/products/:id',
    loadComponent: () =>
      import('./pooboo/pages/product-detail/pooboo-product-detail').then(m => m.PoobooProductDetail)
  },
  {
    path: 'pooboo/fabrics',
    loadComponent: () =>
      import('./pooboo/pages/fabrics/fabrics').then(m => m.Fabrics)
  },
  {
    path: 'pooboo/accessories',
    loadComponent: () =>
      import('./pooboo/pages/accessories/accessories').then(m => m.Accessories)
  },
  {
    path: 'pooboo/accessories/baby-ornaments',
    loadComponent: () =>
      import('./pooboo/pages/accessories/baby-ornaments/baby-ornaments').then(m => m.BabyOrnaments)
  },
  {
    path: 'pooboo/accessories/bands',
    loadComponent: () =>
      import('./pooboo/pages/accessories/bands/bands').then(m => m.Bands)
  },
  {
    path: 'pooboo/accessories/hair-clips',
    loadComponent: () =>
      import('./pooboo/pages/accessories/hair-clips/hair-clips').then(m => m.HairClips)
  },
  {
    path: 'pooboo/fabrics/:id',
    loadComponent: () =>
      import('./pooboo/pages/fabric-detail/fabric-detail').then(m => m.FabricDetail)
  },
  {
    path: 'pooboo/accessories/baby-ornaments/:id',
    loadComponent: () =>
      import('./pooboo/pages/accessory-detail/accessory-detail').then(m => m.AccessoryDetail)
  },
  {
    path: 'pooboo/accessories/bands/:id',
    loadComponent: () =>
      import('./pooboo/pages/accessory-detail/accessory-detail').then(m => m.AccessoryDetail)
  },
  {
    path: 'pooboo/accessories/hair-clips/:id',
    loadComponent: () =>
      import('./pooboo/pages/accessory-detail/accessory-detail').then(m => m.AccessoryDetail)
  },
  {
    path: 'pooboo/reviews',
    redirectTo: '/reviews',
    pathMatch: 'full'
  },
  {
    path: 'pooboo/cart',
    loadComponent: () =>
      import('./pooboo/pages/cart/cart').then(m => m.Cart),
    canActivate: [authGuard]
  },
  {
    path: 'pooboo/wishlist',
    loadComponent: () =>
      import('./pooboo/pages/wishlist/wishlist').then(m => m.Wishlist),
    canActivate: [authGuard]
  },
  {
    path: 'pooboo/enquiry',
    loadComponent: () =>
      import('./pooboo/pages/enquiry/pooboo-enquiry').then(m => m.PoobooEnquiry)
  },
  {
    path: 'pooboo/enquiry-success',
    loadComponent: () =>
      import('./pooboo/pages/enquiry-success/pooboo-enquiry-success').then(m => m.PoobooEnquirySuccess)
  },

  { path: '**', redirectTo: '' }
];