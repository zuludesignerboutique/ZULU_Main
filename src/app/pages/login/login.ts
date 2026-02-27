import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';

  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

  login() {
    if (!this.email || !this.password) {
      this.error = 'Please enter email and password';
      return;
    }
if (this.email === 'test@test.com' && this.password === '123456') {
  this.auth.login();              // 🔥 THIS WAS MISSING
  this.router.navigate(['/home']); // 🔐 now allowed
}

 
else {
      this.error = 'Invalid credentials (try test@test.com / 123456)';
    }
  }
}
