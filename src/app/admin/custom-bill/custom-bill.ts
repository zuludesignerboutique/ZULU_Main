import { Component, OnInit, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BillService } from '../../services/bill.service';
import { CompanySettingsService } from '../../services/company-settings.service';
import { ToastService } from '../../services/toast.service';
import { BillData, CompanySettings, CustomerInfo, BillItem, ManualBillRequest } from '../../core/models/bill.model';

@Component({
  selector: 'app-custom-bill',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './custom-bill.html',
  styleUrls: ['./custom-bill.scss']
})
export class CustomBillComponent implements OnInit {
  private billService = inject(BillService);
  private companySettingsService = inject(CompanySettingsService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  @ViewChild('billPreview') billPreviewRef?: ElementRef<HTMLDivElement>;

  // State signals
  isLoading = signal(false);
  billData = signal<BillData | null>(null);
  companySettings = signal<CompanySettings | null>(null);
  orders = signal<any[]>([]);
  selectedOrderId = signal<number | null>(null);
  searchQuery = signal('');
  currentPage = signal(1);
  pageSize = 20;
  showOrderSelector = signal(true);
  showSettingsPanel = signal(false);
  isManualMode = signal(false);

  // Manual bill form state
  manualCustomer = signal<Partial<CustomerInfo>>({});
  manualItems = signal<Partial<BillItem>[]>([{ name: '', quantity: 1, rate: 0, discount: 0 }]);
  manualNotes = signal('');
  manualTerms = signal('');
  manualBillDate = signal(new Date().toISOString().split('T')[0]);
  manualDueDate = signal(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  // Computed
  filteredOrders = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.orders();
    return this.orders().filter(o =>
      String(o.id).includes(query) ||
      o.user_name?.toLowerCase().includes(query) ||
      o.email?.toLowerCase().includes(query) ||
      o.phone?.includes(query)
    );
  });

  pagedOrders = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredOrders().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filteredOrders().length / this.pageSize) || 1);

  ngOnInit() {
    this.loadCompanySettings();
    this.loadOrders();
  }

  loadCompanySettings() {
    this.companySettingsService.getSettings().subscribe({
      next: (settings) => this.companySettings.set(settings),
      error: () => this.toast.error('Failed to load company settings')
    });
  }

  loadOrders() {
    // GET /api/orders returns { orders, total, page, totalPages, limit },
    // not a bare array — grab .orders before setting the signal.
    this.http.get<any>('/api/orders?limit=1000').subscribe({
      next: (data) => {
        this.orders.set(data.orders || []);
        this.currentPage.set(1);
      },
      error: () => this.toast.error('Failed to load orders')
    });
  }

  onOrderSelect(orderId: number) {
    this.selectedOrderId.set(orderId);
    this.isManualMode.set(false);
    this.generateBillForOrder(orderId);
  }

  generateBillForOrder(orderId: number) {
    this.isLoading.set(true);
    this.billService.getBillForOrder(orderId).subscribe({
      next: (data) => {
        this.billData.set(data);
        this.isLoading.set(false);
        this.showOrderSelector.set(false);
      },
      error: (err) => {
        console.error('Bill generation error:', err);
        this.toast.error('Failed to generate bill');
        this.isLoading.set(false);
      }
    });
  }

  onManualModeToggle() {
    this.isManualMode.update(v => !v);
    if (this.isManualMode()) {
      this.selectedOrderId.set(null);
      this.billData.set(null);
      this.showOrderSelector.set(false);
      this.addManualItem();
    } else {
      this.showOrderSelector.set(true);
    }
  }

  addManualItem() {
    this.manualItems.update(items => [...items, { name: '', quantity: 1, rate: 0, discount: 0 }]);
  }

  removeManualItem(index: number) {
    this.manualItems.update(items => items.length <= 1 ? items : items.filter((_, i) => i !== index));
  }

  generateManualBill() {
    const items = this.manualItems().map(item => ({
      name: item.name || '',
      description: item.description || '',
      hsnCode: item.hsnCode || '9999',
      quantity: item.quantity || 1,
      unit: item.unit || 'PCS',
      rate: item.rate || 0,
      discount: item.discount || 0
    }));

    if (!items.length || items.some(i => !i.name || i.rate <= 0)) {
      this.toast.error('Please fill all item details with valid rates');
      return;
    }

    const request: ManualBillRequest = {
      company: this.companySettings() ? {
        name: this.companySettings()!.name,
        gstin: this.companySettings()!.gstin,
        address: this.companySettings()!.address,
        phone: this.companySettings()!.phone,
        email: this.companySettings()!.email,
        website: this.companySettings()!.website,
        bankName: this.companySettings()!.bankName,
        accountNumber: this.companySettings()!.accountNumber,
        ifscCode: this.companySettings()!.ifscCode,
        upiId: this.companySettings()!.upiId,
        terms: this.companySettings()!.terms,
        footerNote: this.companySettings()!.footerNote,
        logoUrl: this.companySettings()!.logoUrl
      } : undefined,
      customer: this.manualCustomer(),
      items,
      notes: this.manualNotes(),
      termsConditions: this.manualTerms(),
      billDate: this.manualBillDate(),
      dueDate: this.manualDueDate()
    };

    this.isLoading.set(true);
    this.billService.previewManualBill(request).subscribe({
      next: (data) => {
        this.billData.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Failed to generate manual bill');
        this.isLoading.set(false);
      }
    });
  }

  downloadPDF() {
    if (!this.billData()) return;

    // Use browser print for now - client-side PDF generation can be added later
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.toast.error('Please allow popups to print/download bill');
      return;
    }

    const billHtml = this.billPreviewRef?.nativeElement?.outerHTML || '';
    const printCss = `
      <style>
        @media print {
          body { margin: 0; padding: 20px; font-family: 'DejaVu Sans', Arial, sans-serif; }
          .no-print { display: none !important; }
          .bill-container { width: 100%; max-width: 800px; margin: 0 auto; }
          .bill-header { text-align: center; margin-bottom: 20px; }
          .bill-table { width: 100%; border-collapse: collapse; }
          .bill-table th, .bill-table td { border: 1px solid #000; padding: 8px; font-size: 11px; }
          .bill-table th { background: #f0f0f0; }
          .totals-table { width: 300px; margin-left: auto; border-collapse: collapse; }
          .totals-table td { border: 1px solid #000; padding: 6px; font-size: 11px; }
          .totals-table .label { font-weight: bold; }
          .terms { margin-top: 30px; font-size: 10px; line-height: 1.5; }
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill - ${this.billData()!.billNumber}</title>
        ${printCss}
      </head>
      <body>
        ${billHtml}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }

  downloadJSON() {
    if (!this.billData()) return;
    const blob = new Blob([JSON.stringify(this.billData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bill-${this.billData()!.billNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  backToOrders() {
    this.showOrderSelector.set(true);
    this.billData.set(null);
    this.selectedOrderId.set(null);
    this.isManualMode.set(false);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1);
  }

  prevPage() {
    if (this.currentPage() > 1) this.currentPage.update(p => p - 1);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
  }

  saveCompanySettings() {
    if (!this.companySettings()) return;
    const { id, updatedAt, ...settings } = this.companySettings()!;
    this.companySettingsService.updateSettings(settings).subscribe({
      next: () => {
        this.toast.success('Company settings saved');
        this.showSettingsPanel.set(false);
      },
      error: () => this.toast.error('Failed to save settings')
    });
  }

  onLogoUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.companySettings.update(s => s ? { ...s, logoUrl: e.target?.result as string } : null);
      };
      reader.readAsDataURL(file);
    }
  }

  // Helper methods for template
  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'status-pending',
      confirmed: 'status-confirmed',
      shipped: 'status-shipped',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled',
      cancellation_requested: 'status-cancellation-requested'
    };
    return map[status] || '';
  }

  getStatusLabel(status: string): string {
    if (status === 'cancellation_requested') return 'Cancellation Requested';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  hasCGST(): boolean {
    return this.billData()?.totals?.totalCGST !== undefined && this.billData()!.totals.totalCGST > 0;
  }

  hasSGST(): boolean {
    return this.billData()?.totals?.totalSGST !== undefined && this.billData()!.totals.totalSGST > 0;
  }

  hasIGST(): boolean {
    return this.billData()?.totals?.totalIGST !== undefined && this.billData()!.totals.totalIGST > 0;
  }

  // Safe getter for company settings
  get cs(): CompanySettings | null {
    return this.companySettings();
  }
}