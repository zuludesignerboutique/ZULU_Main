import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
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
  private route: ActivatedRoute,
  private http: HttpClient,
  private auth: AuthService
) {}

  login() {
    this.http.post<any>('http://localhost:4000/login', {
      email: this.email,
      password: this.password
    }).subscribe({
     next: (res: any) => {
  this.auth.login();

  const returnUrl =
    this.route.snapshot.queryParams['returnUrl'] || '/home';

  this.router.navigateByUrl(returnUrl);
},
      error: () => {
        this.error = 'Invalid email or password';
      }
    });
  }
}
