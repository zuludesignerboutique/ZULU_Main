import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductCardComponent } from '../../components/product-card/product-card';
import { Product } from '../../core/models/product.model';
// interface Product {
//   id:       number;
//   name:     string;
//   price:    number;
//   image_url:    string;
//   category: string;
//   description: string;
// }

/**
 * HomeComponent is a standalone Angular component that serves as the home page for the application.
 * It displays a collection of products organized in a grid layout.
 */
/**
 * HomeComponent - A standalone Angular component that displays a collection of products
 * This component serves as the main page for showcasing various fashion items
 * It includes product data for bridal wear, party wear, and ethnic clothing
 */
@Component({
  selector: 'app-home',           // HTML selector used to identify this component in templates
  standalone: true,              // Indicates this is a standalone component that doesn't require an NgModule
  imports: [CommonModule, ProductCardComponent, RouterModule], // Required modules and components
  templateUrl: './home.html',    // Path to the component's HTML template
  styleUrls: ['./home.scss']      // Path to the component's SCSS styles
})
export class HomeComponent {

  // Array of Product objects that will be displayed on the home page
  // Each product contains id, name, price, image path, category, and description
  products: Product[] = [
    {
      id:       1,                // Unique identifier for the product
      name:     'ZORA Dress',     // Product name
      price:    6799,             // Product price in some currency
      image_url:    'assets/images/beautiful-bride-white-dress-crown-his-head-park-holding-bouquet.jpg', // Image path
      category: 'bridal',         // Product category
      description: 'This is the product description.' // Detailed product description
    },
    {
      id:       2,                // Unique identifier for the product
      name:     'Party Wear',     // Product name
      price:    4999,             // Product price in some currency
      image_url:    'assets/images/party wear.jpeg', // Image path
      category: 'party',          // Product category
      description: 'This is the product description.' // Detailed product description
    },
    {
      id:       3,                // Unique identifier for the product
      name:     'Ethnic Saree',   // Product name
      price:    2899,             // Product price in some currency
      image_url:    'assets/images/saree 2.jpg', // Image path
      category: 'ethnic',         // Product category
      description: 'This is the product description.' // Detailed product description
    },
    {
      id:       4,                // Unique identifier for the product
      name:     'Royal Lace Dress', // Product name
      price:    5499,             // Product price in some currency
      image_url:    'assets/images/redlace.jpg', // Image path
      category: 'bridal',         // Product category
      description: 'This is the product description.' // Detailed product description
    }
  ];
}