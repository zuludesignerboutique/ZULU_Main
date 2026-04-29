import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  // ══════════════════════════════════════════════
  // SUBMIT
  // ══════════════════════════════════════════════

  submitForm(): void {
    if (!this.form.name || !this.form.email || !this.form.message) return;

    this.isSending = true;
    this.submitted = false;

    // TODO: replace with real HTTP call e.g. this.http.post('/api/contact', this.form)
    setTimeout(() => {
      this.isSending = false;
      this.submitted = true;
      this.form = { name: '', email: '', message: '' };
    }, 1200);
  }
}