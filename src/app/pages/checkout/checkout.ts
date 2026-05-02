import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.scss']
})
export class CheckoutComponent implements OnInit {

  checkoutForm!: FormGroup;
  cartItems: any[] = [];
  isPlacing = false;

  imageBase = 'http://localhost:4000/uploads/';
  private apiBase = 'http://localhost:4000';

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.cartItems = this.cartService.getAll();

    // If cart is empty, redirect back
    if (this.cartItems.length === 0) {
      this.router.navigate(['/cart']);
      return;
    }

    // Pre-fill email from logged-in user
    const userEmail = this.authService.getUserEmail();

    this.checkoutForm = this.fb.group({
      name:    ['', [Validators.required, Validators.minLength(2)]],
      phone:   ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      email:   [userEmail !== 'guest' ? userEmail : '', [Validators.required, Validators.email]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      city:    ['', Validators.required],
      state:   ['', Validators.required],
      pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
  }

  // ── Computed totals ───────────────────────────────

  get subtotal(): number {
    return this.cartItems.reduce((sum, item) => sum + (item.price * (item.qty || 1)), 0);
  }

  get grandTotal(): number {
    return this.subtotal >= 999 ? this.subtotal : this.subtotal + 99;
  }

  // ── Validation helpers ────────────────────────────

  isInvalid(field: string): boolean {
    const ctrl = this.checkoutForm?.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  isValid(field: string): boolean {
    const ctrl = this.checkoutForm?.get(field);
    return !!(ctrl && ctrl.valid && (ctrl.dirty || ctrl.touched));
  }

  // ── Place Order ───────────────────────────────────

  placeOrder() {
    // Mark all fields touched to trigger validation display
    this.checkoutForm.markAllAsTouched();

    if (this.checkoutForm.invalid) return;

    this.isPlacing = true;

    const { name, phone, email, address, city, state, pincode } = this.checkoutForm.value;

    const orderPayload = {
      user_name:    name,
      phone,
      email,
      address:      `${address}, ${city}, ${state} - ${pincode}`,
      total_amount: this.grandTotal,
      items: this.cartItems.map(item => ({
        product_id: item.id,
        quantity:   item.qty || 1,
        price:      item.price
      }))
    };

    this.http.post<any>(`${this.apiBase}/api/orders`, orderPayload).subscribe({
      next: (res) => {
        // Clear cart after successful order
        this.cartService.clear();
        // Navigate to success page with order details
        this.router.navigate(['/order-success'], {
          state: {
            orderId:   res.orderId,
            orderData: orderPayload
          }
        });
      },
      error: (err) => {
        console.error('Order failed:', err);
        this.isPlacing = false;
        alert('Failed to place order. Please try again.');
      }
    });
  }
}