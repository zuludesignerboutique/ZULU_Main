import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

export type WishlistItemType = 'zulu_product' | 'pooboo_product' | 'pooboo_fabric' | 'pooboo_accessory';

// What the caller (product-card, pooboo listing pages, etc.) sends to add an item.
// Denormalized on purpose — the backend snapshots these so the wishlist page and
// the admin dashboard never need to join back against four different product tables.
export interface WishlistAddPayload {
  item_type: WishlistItemType;
  item_id: number;
  brand: 'zulu' | 'pooboo';
  category?: string; // only needed for pooboo_accessory — its detail route is category-scoped
  product_name: string;
  product_code?: string;
  image_url?: string;
  price?: number;
}

// A row as it comes back from the backend
export interface WishlistItem extends WishlistAddPayload {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class WishlistService {

  private api = '';
  private itemsSubject = new BehaviorSubject<WishlistItem[]>([]);
  items$ = this.itemsSubject.asObservable();
  private loaded = false;
  private loading = false;

  // ✅ Bumped every time toggle()/remove() changes state. A refresh() in flight
  // when this changes is now stale — its response gets dropped instead of
  // overwriting the newer state. Fixes: a product-card's initial GET (fired on
  // mount, before you clicked anything) landing late and wiping out a heart you
  // just clicked, or the wishlist page loading with a "missing" item because an
  // old GET from the products page resolves after you've already navigated away.
  private stateVersion = 0;

  constructor(private http: HttpClient) {}

  // ✅ Call once per session (e.g. from a product listing page or product-card) —
  // safe to call repeatedly and from many components at once: only one network
  // request goes out even if 20 product-cards call this in the same tick.
  ensureLoaded() {
    if (!this.loaded && !this.loading) this.refresh();
  }

  // ✅ Force a re-fetch from the backend — used after login/logout so a stale
  // wishlist from a previous session doesn't leak across accounts, and by the
  // wishlist page itself so it always shows the true current state.
  refresh() {
    this.loading = true;
    const requestVersion = this.stateVersion;

    this.http.get<WishlistItem[]>(`${this.api}/api/wishlist`).subscribe({
      next: (data) => {
        this.loading = false;
        this.loaded = true;
        // A toggle/remove landed while this request was in flight — this
        // response is now stale, drop it instead of clobbering the newer state
        if (this.stateVersion !== requestVersion) return;
        this.itemsSubject.next(Array.isArray(data) ? data : []);
      },
      error: () => {
        this.loading = false;
        this.loaded = true;
      }
    });
  }

  // ✅ Clears local state on logout — doesn't touch the backend
  clearLocal() {
    this.stateVersion++;
    this.itemsSubject.next([]);
    this.loaded = false;
    this.loading = false;
  }

  getAll(): WishlistItem[] {
    return this.itemsSubject.value;
  }

  isWishlisted(itemType: WishlistItemType, itemId: number): boolean {
    return this.itemsSubject.value.some(i => i.item_type === itemType && i.item_id === itemId);
  }

  // ✅ Adds/removes and updates local state on success so every product-card
  // showing this item updates its heart in sync, without a full re-fetch.
  // onDone receives the new wishlisted state (true = just added, false = just removed).
  toggle(payload: WishlistAddPayload, onDone?: (wishlisted: boolean) => void, onError?: () => void) {
    const already = this.isWishlisted(payload.item_type, payload.item_id);

    if (already) {
      this.http.delete(`${this.api}/api/wishlist/${payload.item_type}/${payload.item_id}`).subscribe({
        next: () => {
          this.stateVersion++;
          this.itemsSubject.next(
            this.itemsSubject.value.filter(i => !(i.item_type === payload.item_type && i.item_id === payload.item_id))
          );
          onDone?.(false);
        },
        error: () => onError?.()
      });
    } else {
      this.http.post<{ message: string }>(`${this.api}/api/wishlist`, payload).subscribe({
        next: () => {
          // Optimistic local row — good enough for heart-state / count purposes;
          // refresh() will backfill id/user fields next time the wishlist page loads
          const optimisticRow: WishlistItem = {
            ...payload,
            id: 0, user_id: 0, user_name: '', user_email: '', created_at: new Date().toISOString()
          };
          this.stateVersion++;
          this.itemsSubject.next([...this.itemsSubject.value, optimisticRow]);
          onDone?.(true);
        },
        error: () => onError?.()
      });
    }
  }

  remove(itemType: WishlistItemType, itemId: number, onDone?: () => void, onError?: () => void) {
    this.http.delete(`${this.api}/api/wishlist/${itemType}/${itemId}`).subscribe({
      next: () => {
        this.stateVersion++;
        this.itemsSubject.next(
          this.itemsSubject.value.filter(i => !(i.item_type === itemType && i.item_id === itemId))
        );
        onDone?.();
      },
      error: () => onError?.()
    });
  }
}