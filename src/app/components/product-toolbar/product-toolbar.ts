import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-product-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-toolbar.html',
  styleUrl: './product-toolbar.scss'
})
export class ProductToolbar implements OnDestroy {
  // Customizable per page (e.g. "Search fabrics by name or code...")
  @Input() searchPlaceholder = 'Search by name or product code...';

  // Emits the settled (debounced) search term, and the selected sort key
  @Output() searchChange = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<string>();

  searchTerm = '';
  sortValue = 'newest';

  private searchInput$ = new Subject<string>();
  private sub: Subscription = this.searchInput$
    .pipe(debounceTime(300), distinctUntilChanged())
    .subscribe(term => this.searchChange.emit(term));

  onSearchInput(): void {
    this.searchInput$.next(this.searchTerm.trim());
  }

  onSortChange(): void {
    this.sortChange.emit(this.sortValue);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchInput$.next('');
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}