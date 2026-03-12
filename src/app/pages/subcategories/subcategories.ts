import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-subcategories',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './subcategories.html',
  styleUrl: './subcategories.scss'
})
export class SubcategoriesComponent {

  categoryType = '';
  subcategories: any[] = [];

  constructor(private route: ActivatedRoute) {

    this.categoryType = this.route.snapshot.params['type'];

    if (this.categoryType === 'bridal') {
      this.subcategories = [
        { name: 'Bridal Blouse', image: 'assets/images/bridal-blouse.jpg' },
        { name: 'Bridal Saree', image: 'assets/images/bridal-saree.jpg' },
        { name: 'Lehenga', image: 'assets/images/lehenga.jpg' },
        { name: 'Gown', image: 'assets/images/gown.jpg' },
        { name: 'Half Saree', image: 'assets/images/half-saree.jpg' }
      ];
    }

    if (this.categoryType === 'groom') {
      this.subcategories = [
        { name: 'Designer Shirt', image: 'assets/images/designer-shirt.jpg' },
        { name: 'Traditional Dhoti', image: 'assets/images/dhoti.jpg' }
      ];
    }

    if (this.categoryType === 'party') {
      this.subcategories = [
        { name: 'Party Gown', image: 'assets/images/party-gown.jpg' },
        { name: 'Designer Kurti', image: 'assets/images/kurti.jpg' },
        { name: 'Western Dress', image: 'assets/images/western.jpg' }
      ];
    }

    if (this.categoryType === 'casual') {
      this.subcategories = [
        { name: 'T-Shirts', image: 'assets/images/tshirt.jpg' },
        { name: 'Casual Shirts', image: 'assets/images/casual-shirt.jpg' },
        { name: 'Everyday Wear', image: 'assets/images/everyday.jpg' }
      ];
    }

  }

}


// import { Component } from '@angular/core';
// import { ActivatedRoute } from '@angular/router';
// import { RouterModule } from '@angular/router';
// import { CommonModule } from '@angular/common';

// @Component({
//   selector: 'app-subcategories',
//   imports: [CommonModule,RouterModule],
//   standalone: true,
//   templateUrl: './subcategories.html',
//   styleUrl: './subcategories.scss',
// })
// export class SubcategoriesComponent {
//   type = '';

// constructor(private route: ActivatedRoute) {}

// ngOnInit(){
// this.type = this.route.snapshot.params['type'];
// }

// }
