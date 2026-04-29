import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Contact } from './contact';

describe('Contact', () => {
  let component: Contact;
  let fixture: ComponentFixture<Contact>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Contact]
    }).compileComponents();

    fixture = TestBed.createComponent(Contact);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not submit when form fields are empty', () => {
    component.form = { name: '', email: '', message: '' };
    component.submitForm();
    expect(component.isSending).toBeFalsy();
  });

  it('should set isSending to true while submitting', () => {
    component.form = { name: 'Alice', email: 'alice@test.com', message: 'Hello' };
    component.submitForm();
    expect(component.isSending).toBeTruthy();
  });

  it('should show success and reset form after submit', async () => {
    component.form = { name: 'Alice', email: 'alice@test.com', message: 'Hello' };
    component.submitForm();

    await new Promise(r => setTimeout(r, 1300));

    expect(component.submitted).toBeTruthy();
    expect(component.isSending).toBeFalsy();
    expect(component.form.name).toBe('');
  });
});