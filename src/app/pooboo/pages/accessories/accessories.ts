import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PoobooHeader } from '../../layout/pooboo-header/pooboo-header';
import { PoobooFooter } from '../../layout/pooboo-footer/pooboo-footer';

@Component({
  selector: 'app-accessories',
  standalone: true,
  imports: [CommonModule, RouterModule, PoobooHeader, PoobooFooter],
  templateUrl: './accessories.html',
  styleUrl: './accessories.scss'
})
export class Accessories {
  // Category cards are static links — each sub-page
  // (baby-ornaments/bands/hair-clips) fetches and filters
  // its own products independently.
}