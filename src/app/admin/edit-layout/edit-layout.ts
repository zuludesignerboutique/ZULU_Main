import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryLandingService, CategoryLandingCard } from '../../services/category-landing.service';

@Component({
  selector: 'app-edit-layout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-layout.html',
  styleUrl: './edit-layout.scss'
})
export class EditLayout implements OnInit {
  cards: CategoryLandingCard[] = [];
  isLoading = true;
  isSaving = false;
  uploadingSlug: string | null = null;
  saveMessage = '';
  saveError = '';

  constructor(private service: CategoryLandingService, private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadCards();
  }

  loadCards() {
    this.isLoading = true;
    this.service.getAdminCards().subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.cards = res.cards || [];
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  onFilesSelected(event: Event, slug: string) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (!files.length) return;

    for (const f of files) {
      if (f.size > 600 * 1024) {
        this.saveError = 'Image size must be 600 KB or less.';
        input.value = '';
        return;
      }
    }

    const card = this.cards.find(c => c.category_slug === slug);
    if (card && card.images.length + files.length > 5) {
      this.saveError = 'Maximum of 5 images allowed per card.';
      input.value = '';
      return;
    }

    this.saveError = '';
    this.uploadingSlug = slug;
    this.service.uploadImages(slug, files).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.uploadingSlug = null;
          this.cdr.detectChanges();
          this.loadCards();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.uploadingSlug = null;
          this.saveError = err.error?.error || 'Upload failed. Please try again.';
          this.cdr.detectChanges();
        });
      }
    });
    input.value = '';
  }

  deleteImage(slug: string, imageId: number) {
    this.service.deleteImage(slug, imageId).subscribe({
      next: () => this.ngZone.run(() => this.loadCards()),
      error: (err) => {
        this.ngZone.run(() => {
          this.saveError = err.error?.error || 'Failed to delete image.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  moveUp(slug: string, index: number) {
    const card = this.cards.find(c => c.category_slug === slug);
    if (!card || index === 0) return;
    const imgs = card.images;
    [imgs[index - 1], imgs[index]] = [imgs[index], imgs[index - 1]];
    this.persistOrder(slug, imgs);
  }

  moveDown(slug: string, index: number) {
    const card = this.cards.find(c => c.category_slug === slug);
    if (!card || index >= card.images.length - 1) return;
    const imgs = card.images;
    [imgs[index], imgs[index + 1]] = [imgs[index + 1], imgs[index]];
    this.persistOrder(slug, imgs);
  }

  private persistOrder(slug: string, images: any[]) {
    const orderedIds = images.map(img => img.id);
    this.service.reorderImages(slug, orderedIds).subscribe({
      next: () => this.ngZone.run(() => this.cdr.detectChanges()),
      error: () => this.ngZone.run(() => this.loadCards())
    });
  }

  saveCard(card: CategoryLandingCard) {
    this.isSaving = true;
    this.saveError = '';
    this.saveMessage = '';
    this.service.updateCard(card.category_slug, {
      title: card.title,
      subtitle: card.subtitle,
      button_text: card.button_text,
      button_link: card.button_link,
      is_active: card.is_active
    }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSaving = false;
          this.saveMessage = 'Saved successfully!';
          this.cdr.detectChanges();
          setTimeout(() => this.ngZone.run(() => { this.saveMessage = ''; this.cdr.detectChanges(); }), 3000);
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isSaving = false;
          this.saveError = err.error?.error || 'Failed to save. Please try again.';
          this.cdr.detectChanges();
        });
      }
    });
  }
}
