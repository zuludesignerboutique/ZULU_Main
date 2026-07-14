import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PoobooAccessoryService } from '../../services/pooboo-accessory.service';
import { PoobooAccessory } from '../../core/models/pooboo-accessory.model';
import { PoobooHeader } from '../../layout/pooboo-header/pooboo-header';
import { PoobooFooter } from '../../layout/pooboo-footer/pooboo-footer';

type AccessoryTab = 'baby-ornaments' | 'bands' | 'hair-clips';

@Component({
  selector: 'app-accessories',
  standalone: true,
  imports: [CommonModule, RouterModule, PoobooHeader, PoobooFooter],
  templateUrl: './accessories.html',
  styleUrl: './accessories.scss'
})
export class Accessories implements OnInit {

  loading = false;
  error = false;

  tabCounts: Record<AccessoryTab, number> = {
    'baby-ornaments': 0,
    'bands': 0,
    'hair-clips': 0,
  };

  constructor(private accessoryService: PoobooAccessoryService) {}

  ngOnInit(): void {
    this.loadCounts();
  }

  // Just used to show a live count badge on each category card.
  // Each sub-page (baby-ornaments/bands/hair-clips) fetches and
  // filters its own products independently.
  loadCounts(): void {
    this.loading = true;
    this.error = false;

    this.accessoryService.getAll().subscribe({
      next: (products: PoobooAccessory[]) => {
        this.tabCounts = {
          'baby-ornaments': products.filter(p => p.accessory_type === 'baby-ornaments').length,
          'bands':          products.filter(p => p.accessory_type === 'bands').length,
          'hair-clips':     products.filter(p => p.accessory_type === 'hair-clips').length,
        };
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  getTabCount(tab: AccessoryTab): number {
    return this.tabCounts[tab] ?? 0;
  }
}