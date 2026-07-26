import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { PoobooHeader } from '../../layout/pooboo-header/pooboo-header';
import { PoobooFooter } from '../../layout/pooboo-footer/pooboo-footer';

interface EnquiryForm {
  name: string;
  phone: string;
  email: string;
  place: string;
  manualProductCode: string; // optional, only used when no linked product
}

interface FormErrors {
  name: boolean;
  phone: boolean;
  email: boolean;
  place: boolean;
}

interface LinkedProduct {
  name: string;
  code: string;
  price: string;
  category: string;
}

@Component({
  selector: 'app-pooboo-enquiry',
  imports: [CommonModule, FormsModule, PoobooHeader, PoobooFooter],
  templateUrl: './pooboo-enquiry.html',
  styleUrl: './pooboo-enquiry.scss',
})
export class PoobooEnquiry implements OnInit {
  enquiryForm: EnquiryForm = { name: '', phone: '', email: '', place: '', manualProductCode: '' };

  formErrors: FormErrors = { name: false, phone: false, email: false, place: false };

  isSubmitting = false;
  submitError = '';

  linkedProduct: LinkedProduct | null = null;

  readonly wpNumber = '918089506206';

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const name = qp.get('productName');

    if (name) {
      this.linkedProduct = {
        name,
        code: qp.get('productCode') || '',
        price: qp.get('productPrice') || '',
        category: qp.get('productCategory') || ''
      };
    }
  }

  // Builds a compact "Regarding" summary string, e.g. "Satin (PB-FAB-002) — ₹230/meter"
  get productLinkString(): string {
    if (this.linkedProduct) {
      const { name, code, price, category } = this.linkedProduct;
      const sameAsName = category.trim().toLowerCase() === name.trim().toLowerCase();
      const parts = [
        category && !sameAsName ? category : null,
        code ? `${name} (${code})` : name,
        price ? `— ${price}` : null
      ].filter(Boolean);
      return parts.join(' · ');
    }
    if (this.enquiryForm.manualProductCode.trim()) {
      return `Product code: ${this.enquiryForm.manualProductCode.trim()}`;
    }
    return '';
  }

  get whatsappUrl(): string {
    const lines = [
      `Hi POOBOO! 👋`,
      ``,
      `*Name:* ${this.enquiryForm.name}`,
      `*Place:* ${this.enquiryForm.place}`,
    ];

    if (this.productLinkString) {
      lines.push(`*Regarding:* ${this.productLinkString}`);
    }

    lines.push(
      ``,
      `I'd like to enquire about a custom order. Please let me know what options are available!`
    );

    const text = encodeURIComponent(lines.join('\n'));
    return `https://wa.me/${this.wpNumber}?text=${text}`;
  }

  validate(): boolean {
    this.formErrors = {
      name:  !this.enquiryForm.name.trim(),
      phone: !this.enquiryForm.phone.trim() || !/^\+?[\d\s\-]{7,15}$/.test(this.enquiryForm.phone.trim()),
      email: !this.enquiryForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.enquiryForm.email.trim()),
      place: !this.enquiryForm.place.trim(),
    };
    return !Object.values(this.formErrors).some(Boolean);
  }

  submitEnquiry(): void {
    if (!this.validate()) return;

    this.isSubmitting = true;
    this.submitError = '';

    const payload = {
      name: this.enquiryForm.name,
      phone: this.enquiryForm.phone,
      email: this.enquiryForm.email,
      place: this.enquiryForm.place,
      product_link: this.productLinkString
    };

    this.http.post('/api/pooboo/enquiries', payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        window.open(this.whatsappUrl, '_blank');
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = 'Something went wrong. Please try again.';
        console.error('Enquiry submit error:', err);
      },
    });
  }
}