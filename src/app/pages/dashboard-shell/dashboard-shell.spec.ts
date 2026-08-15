import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardShell } from './dashboard-shell';

import { RouterTestingModule } from '@angular/router/testing';

describe('DashboardShell', () => {
  let component: DashboardShell;
  let fixture: ComponentFixture<DashboardShell>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardShell, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardShell);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
