import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Products } from './products';
import { ProductService } from '../../services/product.service';

describe('Products', () => {
  let component: Products;
  let fixture: ComponentFixture<Products>;
  let productService: ProductService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Products, HttpClientTestingModule],
      providers: [ProductService]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Products);
    component = fixture.componentInstance;
    productService = TestBed.inject(ProductService);
    fixture.detectChanges(); // Trigger ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load products on init', () => {
    // Add test to verify products are loaded
    expect(component.products).toBeDefined();
  });
});
