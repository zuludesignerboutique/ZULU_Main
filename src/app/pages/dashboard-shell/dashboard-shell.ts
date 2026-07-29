import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard-shell.html',
  styleUrls: ['./dashboard-shell.scss']
})
export class DashboardShell {
  constructor(private auth: AuthService) {}

  logout() {
    this.auth.logout?.();
  }
}