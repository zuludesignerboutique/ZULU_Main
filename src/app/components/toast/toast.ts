import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrls: ['./toast.scss']
})
export class Toast {
  constructor(readonly service: ToastService) {}

  icon(type: string): string {
    return type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  }

  answer(id: number, value: boolean): void {
    this.service.answerConfirm(id, value);
  }
}
