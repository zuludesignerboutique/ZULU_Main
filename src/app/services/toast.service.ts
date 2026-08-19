import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

export interface ToastConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmItem extends ToastConfirmOptions {
  id: number;
  resolve: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);
  readonly confirmations = signal<ConfirmItem[]>([]);

  private counter = 0;

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message);
  }

  info(message: string): void {
    this.show('info', message);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  confirm(options: ToastConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      const id = ++this.counter;
      this.confirmations.update((list) => [...list, { id, ...options, resolve }]);
    });
  }

  answerConfirm(id: number, value: boolean): void {
    const item = this.confirmations().find((c) => c.id === id);
    if (!item) return;
    this.confirmations.update((list) => list.filter((c) => c.id !== id));
    item.resolve(value);
  }

  private show(type: ToastType, message: string): void {
    const id = ++this.counter;
    this.toasts.update((list) => [...list, { id, type, message }]);
    setTimeout(() => this.dismiss(id), 4000);
  }
}
