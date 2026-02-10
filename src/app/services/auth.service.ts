import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private loggedIn = false;
  private userEmail: string | null = null;

  login(email: string) {
    this.loggedIn = true;
    this.userEmail = email;
  }

  signup(email: string) {
    this.loggedIn = true;
    this.userEmail = email;
  }

  logout() {
    this.loggedIn = false;
    this.userEmail = null;
  }

  isLoggedIn() {
    return this.loggedIn;
  }

  getUserEmail() {
    return this.userEmail;
  }
}
