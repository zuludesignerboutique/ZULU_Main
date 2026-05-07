import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

declare var Razorpay: any;

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.scss']
})
export class Checkout implements OnInit, AfterViewInit {

  checkoutForm!: FormGroup;
  cartItems: any[] = [];
  isPlacing    = false;
  isLoggedIn   = false;
  paymentError = '';
  razorpayReady = false;

  imageBase  = 'http://localhost:4000/uploads/';
  private api = 'http://localhost:4000';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private auth: AuthService,
    private cart: CartService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.auth.isLoggedIn();

    this.checkoutForm = this.fb.group({
      email:   ['', [Validators.required, Validators.email]],
      phone:   ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      name:    ['', [Validators.required, Validators.minLength(2)]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      city:    ['', Validators.required],
      state:   ['', Validators.required],
      pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });

    // Pre-fill email if logged in
    const email = this.auth.getUserEmail();
    if (email && email !== 'guest') {
      this.checkoutForm.patchValue({ email });
    }

    this.cartItems = this.cart.getAll();

    if (this.cartItems.length === 0) {
      this.router.navigate(['/cart']);
    }
  }

  // ✅ Load Razorpay in AfterViewInit — guaranteed browser, never SSR
  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadRazorpayScript();
  }

  private loadRazorpayScript(): void {
    if ((window as any).Razorpay) {
      this.razorpayReady = true;
      return;
    }
    const script  = document.createElement('script');
    script.src    = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async  = true;
    script.onload = () => { this.razorpayReady = true; };
    script.onerror = () => {
      this.paymentError = 'Payment system failed to load. Please refresh and try again.';
    };
    document.body.appendChild(script);
  }

  // ── Totals ───────────────────────────────────────
  get subtotal(): number {
    return this.cartItems.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
  }

  get grandTotal(): number {
    return this.subtotal + (this.subtotal >= 999 ? 0 : 99);
  }

  // ── Validation ───────────────────────────────────
  isInvalid(field: string): boolean {
    const ctrl = this.checkoutForm.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  isValid(field: string): boolean {
    const ctrl = this.checkoutForm.get(field);
    return !!(ctrl && ctrl.valid && (ctrl.dirty || ctrl.touched));
  }

  // ── Place Order ──────────────────────────────────
  placeOrder() {
    this.paymentError = '';
    this.checkoutForm.markAllAsTouched();

    if (this.checkoutForm.invalid) {
      this.paymentError = 'Please fill in all required fields correctly.';
      return;
    }

    // ✅ Guard: Razorpay must be ready
    if (!this.razorpayReady || !(window as any).Razorpay) {
      this.paymentError = 'Payment system is still loading. Please wait a moment and try again.';
      this.loadRazorpayScript();
      return;
    }

    this.isPlacing = true;

    const { email, phone, name, address, city, state, pincode } = this.checkoutForm.value;
    const fullAddress = `${address}, ${city}, ${state} - ${pincode}`;

    // STEP 1: Save order to DB
    this.http.post<{ orderId: number }>(`${this.api}/api/orders`, {
      user_name:    name,
      email,
      phone,
      address:      fullAddress,
      total_amount: this.grandTotal,
      items: this.cartItems.map(item => ({
        product_id: item.id,
        quantity:   item.qty || 1,
        price:      item.price
      }))
    }).subscribe({
      next: (res) => {
        // STEP 2: Open Razorpay
        this.openRazorpay(res.orderId, email, phone, name);
      },
      error: (err) => {
        console.error('[Checkout] Order creation error:', err);
        this.paymentError = 'Could not create order. Please try again.';
        this.isPlacing = false;
      }
    });
  }

  private openRazorpay(orderId: number, email: string, phone: string, name: string) {
    // STEP 3: Create Razorpay payment order on backend
    this.http.post<any>(`${this.api}/api/razorpay/create-order`, {
      amount: this.grandTotal
    }).subscribe({
      next: (rzpOrder) => {
        const options: any = {
          key:         rzpOrder.key,
          amount:      rzpOrder.amount,
          currency:    rzpOrder.currency || 'INR',
          name:        'ZULU Boutique',
          description: `Order #${orderId}`,
          order_id:    rzpOrder.orderId,
          prefill:     { name, email, contact: phone },
          theme:       { color: '#c8a96e' },
          handler: (response: any) => {
            // STEP 4: Verify payment
            this.verifyPayment(orderId, response);
          },
          modal: {
            ondismiss: () => {
              this.paymentError = 'Payment was cancelled. You can try again.';
              this.isPlacing = false;
            }
          }
        };

        try {
          const rzp = new Razorpay(options);
          rzp.on('payment.failed', (response: any) => {
            this.isPlacing = false;
            this.paymentError = `Payment failed: ${response.error?.description || 'Unknown error'}`;
          });
          rzp.open();
        } catch (e) {
          console.error('Razorpay open error:', e);
          this.isPlacing = false;
          this.paymentError = 'Could not open payment window. Please refresh and try again.';
        }
      },
      error: (err) => {
        console.error('[Checkout] Razorpay order error:', err);
        this.paymentError = 'Payment initiation failed. Please try again.';
        this.isPlacing = false;
      }
    });
  }

  private verifyPayment(orderId: number, response: any) {
    // STEP 5: Verify signature
    this.http.post<any>(`${this.api}/api/razorpay/verify-payment`, {
      razorpay_order_id:   response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature:  response.razorpay_signature,
    }).subscribe({
      next: (verifyRes) => {
        if (!verifyRes.verified) {
          this.isPlacing = false;
          this.paymentError = 'Payment verification failed. Please contact support.';
          return;
        }
        // STEP 6: Clear cart → success page
        this.cart.clear();
        this.router.navigate(['/order-success'], {
          state: {
            orderId,
            orderData: { ...this.checkoutForm.value, total_amount: this.grandTotal }
          }
        });
      },
      error: (err) => {
        console.error('[Checkout] Verify error:', err);
        this.isPlacing = false;
        this.paymentError = `Verification failed. Contact support with ID: ${response.razorpay_payment_id}`;
      }
    });
  }
}