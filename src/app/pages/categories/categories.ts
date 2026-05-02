import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class Categories {

  categories = [
    {
      name: 'Bridal Collection',
      image: 'assets/images/bridal-collection.jpg',
      route: '/categories/bridal'
    },
    {
      name: 'Groom Collection',
      image: 'assets/images/Groom.jpg',
      route: '/categories/groom'
    },
    {
      name: 'Party Wear',
      image: 'assets/images/party-wear.jpg',
      route: '/categories/party'
    },
    {
      name: 'Casual Wear',
      image: 'assets/images/Casual-wear.jpg',
      route: '/categories/casual'
    }
  ];

}