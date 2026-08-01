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

  // ✅ Saved profile data (dashboard) — used to build selectable address/phone options
  savedAddresses: { id: string; label: string; address: string; city: string; state: string; pincode: string }[] = [];
  savedPhones: { id: string; label: string; value: string }[] = [];
  selectedAddressId: string | null = null;
  selectedPhoneId: string | null = null;

  imageBase  = '/uploads/';
  private api = '';

  // ✅ Tracks whether a real Razorpay payment attempt happened for the current
  // pending order, so an abandoned checkout (closed with no attempt) can be
  // cleaned up silently while a failed attempt stays visible for the admin.
  private paymentAttempted = false;
  private pendingOrderId: number | null = null;

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

    // ✅ Pull saved name / phones / addresses from the dashboard profile
    if (this.isLoggedIn) {
      this.loadSavedProfile();
    }

    // ✅ Only the items ticked on the cart page — not the whole cart
    this.cartItems = this.cart.getCheckoutItems();

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

  // ── Saved profile (from User Dashboard) ─────────
  private loadSavedProfile(): void {
    this.http.get<any>('/api/users/me').subscribe({
      next: (data) => {
        // Prefill name — user can still overwrite it
        if (data.name) this.checkoutForm.patchValue({ name: data.name });

        // Build selectable phone numbers
        this.savedPhones = [];
        if (data.phone1) this.savedPhones.push({ id: 'phone1', label: 'Primary', value: data.phone1 });
        if (data.phone2) this.savedPhones.push({ id: 'phone2', label: 'Secondary', value: data.phone2 });
        if (this.savedPhones.length) {
          this.selectPhone(this.savedPhones[0]);
        }

        // Build selectable addresses
        this.savedAddresses = [];
        if (data.address1) {
          this.savedAddresses.push({
            id: 'address1', label: 'Home',
            address: data.address1, city: data.district || '', state: data.state || '', pincode: data.pincode || ''
          });
        }
        if (data.address2) {
          this.savedAddresses.push({
            id: 'address2', label: 'Office',
            address: data.address2, city: data.district || '', state: data.state || '', pincode: data.pincode || ''
          });
        }
        if (this.savedAddresses.length) {
          this.selectAddress(this.savedAddresses[0]);
        }
      },
      error: (err) => {
        // Non-fatal — checkout still works as a plain manual form
        console.error('[Checkout] Could not load saved profile:', err.status, err.error);
      }
    });
  }

  selectPhone(phone: { id: string; label: string; value: string }): void {
    this.selectedPhoneId = phone.id;
    this.checkoutForm.patchValue({ phone: phone.value });
  }

  selectAddress(addr: { id: string; label: string; address: string; city: string; state: string; pincode: string }): void {
    this.selectedAddressId = addr.id;
    this.checkoutForm.patchValue({
      address: addr.address,
      city:    addr.city,
      state:   addr.state,
      pincode: addr.pincode
    });
  }

  // ✅ Any manual edit to the address/city/state/pincode fields deselects the saved-address
  // chip, so the UI doesn't imply "Home" is still selected once the user has changed it.
  onAddressFieldEdited(): void {
    if (!this.selectedAddressId) return;
    const selected = this.savedAddresses.find(a => a.id === this.selectedAddressId);
    if (!selected) return;
    const v = this.checkoutForm.value;
    const stillMatches =
      v.address === selected.address &&
      v.city === selected.city &&
      v.state === selected.state &&
      v.pincode === selected.pincode;
    if (!stillMatches) this.selectedAddressId = null;
  }

  onPhoneFieldEdited(): void {
    if (!this.selectedPhoneId) return;
    const selected = this.savedPhones.find(p => p.id === this.selectedPhoneId);
    if (!selected) return;
    if (this.checkoutForm.value.phone !== selected.value) this.selectedPhoneId = null;
  }

  // ── Totals ───────────────────────────────────────
  get subtotal(): number {
    return this.cartItems.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
  }

  get grandTotal(): number {
    return this.subtotal + (this.subtotal >= 2500 ? 0 : 99);
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

    // STEP 1: Save order to DB — ✅ include size per item
    this.http.post<{ orderId: number }>('/api/orders', {
      user_name:    name,
      email,
      phone,
      address:      fullAddress,
      total_amount: this.grandTotal,
      items: this.cartItems.map(item => ({
        product_id:   item.id,
        quantity:     item.qty || 1,
        price:        item.price,
        size:         item.size || null,
        brand:        item.brand || 'zulu',
        product_type: item.product_type || 'apparel',
        product_code: item.product_code || ''
      }))
    }).subscribe({
      next: (res) => {
        this.pendingOrderId = res.orderId;
        this.paymentAttempted = false;
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

              // ✅ No real payment attempt happened — clean up the pending order silently.
              if (!this.paymentAttempted && this.pendingOrderId) {
                this.http.delete(`${this.api}/api/orders/${this.pendingOrderId}`).subscribe({
                  error: (e) => console.error('[Checkout] Could not remove abandoned order:', e)
                });
              }
              this.pendingOrderId = null;
            }
          }
        };

        try {
          const rzp = new Razorpay(options);
          rzp.on('payment.failed', (response: any) => {
            // ✅ A real attempt happened — leave this order for the admin to see.
            this.paymentAttempted = true;
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
    this.http.post<any>('/api/razorpay/verify-payment', {
      orderId,
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
        this.pendingOrderId = null;
        // STEP 6: Remove only the paid-for items → keep whatever was left unchecked in the cart
        this.cart.removeItems(this.cartItems);
        this.cart.clearCheckoutItems();
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