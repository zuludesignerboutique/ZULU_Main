import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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
    private auth: AuthService   // ✅ inject AuthService
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

    // TEMP: fake signup success
    this.auth.login();                // ✅ mark user as logged in
    this.router.navigate(['/home']);  // ✅ go to main site
  }
}


// import { Component } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { Router, RouterModule } from '@angular/router';

// @Component({
//   selector: 'app-signup',
//   standalone: true,
//   imports: [CommonModule, FormsModule, RouterModule],
//   templateUrl: './signup.html',
//   styleUrls: ['./signup.scss'],
// })
// export class SignupComponent {
//   name = '';
//   email = '';
//   password = '';
//   confirmPassword = '';
//   error = '';

//   constructor(private router: Router) {}

//   signup() {
//     if (!this.name || !this.email || !this.password) {
//       this.error = 'All fields are required';
//       return;
//     }

//     if (this.password !== this.confirmPassword) {
//       this.error = 'Passwords do not match';
//       return;
//     }

//     // TEMP: fake signup success
//     this.router.navigate(['/login']);
//   }
// }
