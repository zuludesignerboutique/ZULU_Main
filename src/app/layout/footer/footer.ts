import { Component } from '@angular/core';
import { RouterLink } from "@angular/router";
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, RouterModule],
  standalone: true,
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {

}
