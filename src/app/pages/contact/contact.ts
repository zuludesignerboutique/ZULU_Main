import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact {

  // ══════════════════════════════════════════════
  // FORM STATE
  // ══════════════════════════════════════════════

  form = { name: '', email: '', message: '' };

  isSending = false;
  submitted = false;
  errorMsg = '';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  // ══════════════════════════════════════════════
  // SUBMIT
  // ══════════════════════════════════════════════

  submitForm(): void {
    if (!this.form.name || !this.form.email || !this.form.message) return;

    this.isSending = true;
    this.submitted = false;
    this.errorMsg = '';

    this.http.post<{ message: string }>('/api/contact', this.form).subscribe({
      next: () => {
        this.isSending = false;
        this.submitted = true;
        this.form = { name: '', email: '', message: '' };
        this.cdr.detectChanges();
      },
      error: () => {
        this.isSending = false;
        this.errorMsg = 'Something went wrong. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }
}