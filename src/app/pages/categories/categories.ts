import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-categories',
  imports: [RouterModule, CommonModule],
  standalone: true,
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class CategoriesComponent {
}
