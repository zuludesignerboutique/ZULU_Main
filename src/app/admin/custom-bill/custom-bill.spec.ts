import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { CustomBillComponent } from './custom-bill';
import { BillService } from '../../services/bill.service';
import { CompanySettingsService } from '../../services/company-settings.service';
import { ToastService } from '../../services/toast.service';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BillData, CompanySettings } from '../../core/models/bill.model';

describe('CustomBillComponent', () => {
  let component: CustomBillComponent;
  let fixture: any;

  const mockActivatedRoute = {
    snapshot: { queryParams: {} },
    queryParams: of({})
  };

  const mockBillData: BillData = {
    billNumber: 'ZULU-202608-000001',
    billDate: '2026-08-21',
    dueDate: '2026-09-04',
    company: {
      id: 1,
      name: 'ZULU Boutique',
      gstin: '27AAAAA0000A1Z5',
      address: '123 Main St, Mumbai',
      phone: '+91-9876543210',
      email: 'info@zulu.com',
      website: 'https://zulu.com',
      bankName: 'HDFC Bank',
      accountNumber: '1234567890',
      ifscCode: 'HDFC0001234',
      upiId: 'zulu@hdfc',
      terms: 'Terms and conditions apply',
      footerNote: 'Thank you for your business!',
      logoUrl: '',
      updatedAt: '2026-08-21T00:00:00Z'
    },
    customer: {
      name: 'John Doe',
      phone: '9876543210',
      email: 'john@example.com',
      address: '456 Customer Ave, Delhi',
      gstin: ''
    },
    items: [
      {
        srNo: 1,
        name: 'Silk Saree',
        description: 'Premium silk saree',
        hsnCode: '5007',
        quantity: 2,
        unit: 'PCS',
        rate: 5000,
        discount: 0,
        taxableValue: 10000,
        cgst: 900,
        sgst: 900,
        igst: 0,
        total: 11800
      }
    ],
    totals: {
      subtotal: 10000,
      totalDiscount: 0,
      totalTaxable: 10000,
      totalCGST: 900,
      totalSGST: 900,
      totalIGST: 0,
      totalTax: 1800,
      grandTotal: 11800,
      roundOff: 0,
      amountInWords: 'Eleven Thousand Eight Hundred Rupees Only'
    },
    payment: {
      method: 'Online (Razorpay)',
      transactionId: 'pay_123456',
      paidAmount: 11800,
      balanceAmount: 0
    },
    notes: '',
    termsConditions: 'Terms and conditions apply'
  };

  const mockCompanySettings: CompanySettings = {
    id: 1,
    name: 'ZULU Boutique',
    gstin: '27AAAAA0000A1Z5',
    address: '123 Main St, Mumbai',
    phone: '+91-9876543210',
    email: 'info@zulu.com',
    website: 'https://zulu.com',
    bankName: 'HDFC Bank',
    accountNumber: '1234567890',
    ifscCode: 'HDFC0001234',
    upiId: 'zulu@hdfc',
    terms: 'Terms and conditions apply',
    footerNote: 'Thank you for your business!',
    logoUrl: '',
    updatedAt: '2026-08-21T00:00:00Z'
  };

  const mockOrders = [
    { id: 1, user_name: 'John Doe', phone: '9876543210', email: 'john@example.com', total_amount: 11800, status: 'confirmed', created_at: '2026-08-21' },
    { id: 2, user_name: 'Jane Smith', phone: '9876543211', email: 'jane@example.com', total_amount: 5900, status: 'pending', created_at: '2026-08-20' }
  ];

  const billServiceSpy = {
    getBillForOrder: vi.fn().mockReturnValue(of(mockBillData)),
    previewManualBill: vi.fn().mockReturnValue(of(mockBillData)),
    downloadBill: vi.fn()
  };
  const companySettingsServiceSpy = {
    getSettings: vi.fn().mockReturnValue(of(mockCompanySettings)),
    updateSettings: vi.fn().mockReturnValue(of({ message: 'Settings updated' }))
  };
  const toastServiceSpy = {
    success: vi.fn(),
    error: vi.fn()
  };
  const httpClientSpy = {
    get: vi.fn().mockReturnValue(of(mockOrders))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomBillComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: BillService, useValue: billServiceSpy },
        { provide: CompanySettingsService, useValue: companySettingsServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomBillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load company settings on init', () => {
    expect(companySettingsServiceSpy.getSettings).toHaveBeenCalled();
    expect(component.companySettings()).toEqual(mockCompanySettings);
  });

  it('should load orders on init', () => {
    expect(httpClientSpy.get).toHaveBeenCalledWith('/api/orders');
    expect(component.orders()).toEqual(mockOrders);
  });

  it('should filter orders by search query', () => {
    component.searchQuery.set('John');
    expect(component.filteredOrders().length).toBe(1);
    expect(component.filteredOrders()[0].user_name).toBe('John Doe');
  });

  it('should generate bill for selected order', () => {
    component.onOrderSelect(1);
    expect(billServiceSpy.getBillForOrder).toHaveBeenCalledWith(1);
    expect(component.selectedOrderId()).toBe(1);
    expect(component.isManualMode()).toBeFalsy();
  });

  it('should toggle manual mode', () => {
    component.onManualModeToggle();
    expect(component.isManualMode()).toBeTruthy();
    expect(component.showOrderSelector()).toBeFalsy();
  });

  it('should add manual item', () => {
    const initialCount = component.manualItems().length;
    component.addManualItem();
    expect(component.manualItems().length).toBe(initialCount + 1);
  });

  it('should remove manual item', () => {
    component.addManualItem();
    const countAfterAdd = component.manualItems().length;
    component.removeManualItem(0);
    expect(component.manualItems().length).toBe(countAfterAdd - 1);
  });

  it('should not remove last manual item', () => {
    component.manualItems.set([{ name: '', quantity: 1, rate: 0, discount: 0 }]);
    component.removeManualItem(0);
    expect(component.manualItems().length).toBe(1);
  });

  it('should format currency correctly', () => {
    expect(component.formatCurrency(11800)).toContain('₹');
    expect(component.formatCurrency(11800)).toContain('11,800');
  });

  it('should return correct status class', () => {
    expect(component.getStatusClass('pending')).toBe('status-pending');
    expect(component.getStatusClass('confirmed')).toBe('status-confirmed');
    expect(component.getStatusClass('cancelled')).toBe('status-cancelled');
    expect(component.getStatusClass('unknown')).toBe('');
  });

  it('should return correct status label', () => {
    expect(component.getStatusLabel('pending')).toBe('Pending');
    expect(component.getStatusLabel('cancellation_requested')).toBe('Cancellation Requested');
  });

  it('should check GST types correctly', () => {
    component.billData.set(mockBillData);
    expect(component.hasCGST()).toBeTruthy();
    expect(component.hasSGST()).toBeTruthy();
    expect(component.hasIGST()).toBeFalsy();
  });

  it('should save company settings', () => {
    component.companySettings.set(mockCompanySettings);
    component.saveCompanySettings();
    expect(companySettingsServiceSpy.updateSettings).toHaveBeenCalled();
    expect(toastServiceSpy.success).toHaveBeenCalledWith('Company settings saved');
  });

  it('should go back to orders', () => {
    component.billData.set(mockBillData);
    component.selectedOrderId.set(1);
    component.showOrderSelector.set(false);
    component.backToOrders();
    expect(component.showOrderSelector()).toBeTruthy();
    expect(component.billData()).toBeNull();
    expect(component.selectedOrderId()).toBeNull();
  });
});