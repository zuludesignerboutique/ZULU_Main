import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterModule],   // ✅ ADD THIS LINE
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.scss']
})
export class AdminLayoutComponent {
   constructor(private router: Router) {} 
  logout(){
  localStorage.removeItem('admin');
  this.router.navigate(['/login']);
}
}