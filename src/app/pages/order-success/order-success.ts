import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-success.html',
  styleUrls: ['./order-success.scss']
})
export class OrderSuccessComponent implements OnInit {
  orderId: number | null = null;
  orderData: any = null;

  constructor(private router: Router) {}

  ngOnInit() {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state ?? history.state;

    if (state?.orderId) {
      this.orderId  = state.orderId;
      this.orderData = state.orderData;
    } else {
      // If someone lands here directly with no order, send them home
      this.router.navigate(['/home']);
    }
  }
}