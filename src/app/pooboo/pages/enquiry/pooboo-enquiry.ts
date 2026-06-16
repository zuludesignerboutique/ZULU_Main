import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface EnquiryForm {
  name: string;
  phone: string;
  email: string;
  place: string;
}

interface FormErrors {
  name: boolean;
  phone: boolean;
  email: boolean;
  place: boolean;
}

@Component({
  selector: 'app-pooboo-enquiry',
  imports: [CommonModule, FormsModule],
  templateUrl: './pooboo-enquiry.html',
  styleUrl: './pooboo-enquiry.scss',
})
export class PoobooEnquiry {
  enquiryForm: EnquiryForm = { name: '', phone: '', email: '', place: '' };

  formErrors: FormErrors = { name: false, phone: false, email: false, place: false };

  isSubmitting = false;
  submitError = '';

  readonly wpNumber = '918089506206';

  get whatsappUrl(): string {
    const text = encodeURIComponent(
      `Hi POOBOO! I'm ${this.enquiryForm.name} from ${this.enquiryForm.place}. I'd like to enquire about a custom order. Please let me know what options are available!`
    );
    return `https://wa.me/${this.wpNumber}?text=${text}`;
  }

  constructor(private http: HttpClient) {}

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

    this.http.post('/api/pooboo/enquiries', this.enquiryForm).subscribe({
      next: () => {
        this.isSubmitting = false;
        // Open WhatsApp immediately after save
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