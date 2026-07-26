import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ReactiveFormsModule],
  templateUrl: './user-dashboard.html',
  styleUrls: ['./user-dashboard.scss']
})
export class UserDashboard implements OnInit {

  profileForm!: FormGroup;

  isLoading  = true;
  isSaving   = false;
  saveSuccess = false;
  loadError  = '';
  saveError  = '';

  userName = ''; // shown in the sidebar header once loaded

  private api = 'http://localhost:4000';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private auth: AuthService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.profileForm = this.fb.group({
      name:     ['', [Validators.required, Validators.minLength(2)]],
      email:    [{ value: '', disabled: true }], // ✅ read-only — cart/orders are keyed by email
      phone1:   ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      phone2:   ['', [Validators.pattern(/^[6-9]\d{9}$/)]], // optional — pattern only enforced if filled
      address1: ['', [Validators.required, Validators.minLength(5)]],
      address2: [''], // optional
      district: ['', [Validators.required, Validators.minLength(2)]],
      state:    ['', [Validators.required, Validators.minLength(2)]],
      pincode:  ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });

    this.loadProfile();
  }

  loadProfile() {
    this.isLoading = true;
    this.loadError = '';

    this.http.get<any>(`${this.api}/api/users/me`).subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.userName = data.name;
          this.profileForm.patchValue({
            name:     data.name || '',
            email:    data.email || '',
            phone1:   data.phone1 || '',
            phone2:   data.phone2 || '',
            address1: data.address1 || '',
            address2: data.address2 || '',
            district: data.district || '',
            state:    data.state || '',
            pincode:  data.pincode || ''
          });
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          console.error('[UserDashboard] load profile error:', err.status, err.error);
          this.loadError = 'Could not load your profile. Please try again.';
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  isInvalid(field: string): boolean {
    const ctrl = this.profileForm.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  isValid(field: string): boolean {
    const ctrl = this.profileForm.get(field);
    return !!(ctrl && ctrl.valid && (ctrl.dirty || ctrl.touched));
  }

  saveProfile() {
    this.saveError = '';
    this.saveSuccess = false;
    this.profileForm.markAllAsTouched();

    if (this.profileForm.invalid) {
      this.saveError = 'Please fill in all required fields correctly.';
      return;
    }

    this.isSaving = true;

    // ✅ email intentionally excluded — read-only field, not sent to the update endpoint
    const { name, phone1, phone2, address1, address2, district, state, pincode } = this.profileForm.getRawValue();

    this.http.put(`${this.api}/api/users/me`, {
      name, phone1, phone2, address1, address2, district, state, pincode
    }).subscribe({
      next: () => {
        this.zone.run(() => {
          this.isSaving = false;
          this.saveSuccess = true;
          this.userName = name;
          this.cdr.detectChanges();
          setTimeout(() => {
            this.saveSuccess = false;
            this.cdr.detectChanges();
          }, 3000);
        });
      },
      error: (err) => {
        this.zone.run(() => {
          console.error('[UserDashboard] save profile error:', err.status, err.error);
          this.isSaving = false;
          this.saveError = 'Could not save your changes. Please try again.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  logout() {
    this.auth.logout?.();
  }
}