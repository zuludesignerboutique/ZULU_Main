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

  login(){

  this.http.post<any>('http://localhost:4000/login', {
    email: this.email,
    password: this.password
  }).subscribe(res => {

    if(res.user.role === 'admin'){

      localStorage.setItem('admin', 'true');
      this.router.navigate(['/admin/dashboard']);

    } else {

      localStorage.setItem('user', 'true');
      this.router.navigate(['/home']);

    }

  }, err => {

    alert("Invalid login");

  });

}
}
