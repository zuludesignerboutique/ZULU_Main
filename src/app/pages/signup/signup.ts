import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';      // ✅ ADD
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './signup.html',
  styleUrls: ['./signup.scss'],
})
export class SignupComponent {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  error = '';

  constructor(
    private router: Router,
    private http: HttpClient,         // ✅ ADD
    private auth: AuthService
  ) {}

  signup() {
    if (!this.name || !this.email || !this.password) {
      this.error = 'All fields are required';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    this.http.post<any>('/api/signup', {
      name: this.name,
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res: any) => {
        this.auth.login(this.email, res.token);
        this.router.navigate(['/home']);
      },
      error: (err) => {
        if (err.status === 409) {
          this.error = 'Email already exists';
        } else {
          this.error = 'Signup failed. Try again.';
        }
      }
    });
  }
}