import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../services/toast.service';

interface GalleryRow {
  id: number;
  title: string;
  description: string;
  image_url: string;
  display_order: number;
}

interface PendingPhoto {
  file: File;
  previewUrl: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-admin-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-gallery.html',
  styleUrls: ['./admin-gallery.scss']
})
export class AdminGallery implements OnInit, OnDestroy {

  images: GalleryRow[] = [];
  isLoading = true;

  // Photos picked but not yet uploaded — each gets its own caption before
  // "Upload All" is pressed, like a social-media multi-photo post flow.
  pending: PendingPhoto[] = [];
  isUploading = false;

  // Inline edit state — one row editable at a time
  editingId: number | null = null;
  editTitle = '';
  editDescription = '';

  // Disables the action buttons on a row while a request for it is in flight
  savingId: number | null = null;

  private api = '';

  constructor(
    private http: HttpClient,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadImages();
  }

  ngOnDestroy() {
    this.clearPending();
  }

  loadImages() {
    this.isLoading = true;
    this.http.get<GalleryRow[]>(`${this.api}/api/gallery`).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.images = data;
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

  // ── Pick photos → caption each → upload all ─────────────────

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    files.forEach(file => {
      this.pending.push({
        file,
        previewUrl: URL.createObjectURL(file),
        title: '',
        description: ''
      });
    });
    input.value = ''; // allow re-selecting the same file(s) later
  }

  removePending(index: number) {
    URL.revokeObjectURL(this.pending[index].previewUrl);
    this.pending.splice(index, 1);
  }

  clearPending() {
    this.pending.forEach(p => URL.revokeObjectURL(p.previewUrl));
    this.pending = [];
  }

  uploadPending() {
    if (!this.pending.length || this.isUploading) return;
    this.isUploading = true;

    const formData = new FormData();
    const meta = this.pending.map(p => ({
      title: p.title.trim(),
      description: p.description.trim()
    }));
    this.pending.forEach(p => formData.append('images', p.file));
    formData.append('meta', JSON.stringify(meta));

    this.http.post<{ images: GalleryRow[] }>(`${this.api}/api/admin/gallery`, formData).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.clearPending();
          this.isUploading = false;
          this.loadImages();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.isUploading = false;
          this.cdr.detectChanges();
          this.toast.error('Upload failed. Please try again.');
        });
      }
    });
  }

  // ── Edit existing ────────────────────────────────────────────

  startEdit(img: GalleryRow) {
    this.editingId = img.id;
    this.editTitle = img.title;
    this.editDescription = img.description;
  }

  cancelEdit() {
    this.editingId = null;
  }

  saveEdit(img: GalleryRow) {
    this.savingId = img.id;
    const title = this.editTitle.trim();
    const description = this.editDescription.trim();

    this.http.patch(`${this.api}/api/admin/gallery/${img.id}`, { title, description }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          img.title = title;
          img.description = description;
          this.editingId = null;
          this.savingId = null;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.toast.error('Could not save changes. Please try again.');
          this.savingId = null;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ── Delete ────────────────────────────────────────────────────

  async deleteImage(img: GalleryRow) {
    const confirmed = await this.toast.confirm({
      title: 'Delete image?',
      message: `Delete "${img.title || 'this image'}"? This can't be undone.`,
      confirmLabel: 'Delete'
    });
    if (!confirmed) return;

    this.savingId = img.id;
    this.http.delete(`${this.api}/api/admin/gallery/${img.id}`).subscribe({
      next: () => {
        this.ngZone.run(() => {
          if (this.editingId === img.id) this.editingId = null;   // don't leave a stale edit panel open
          this.images = this.images.filter(i => i.id !== img.id);
          this.savingId = null;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.toast.error('Could not delete the image. Please try again.');
          this.savingId = null;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ── Reorder — simple up/down move, persisted immediately ───────

  moveUp(index: number) {
    if (index === 0) return;
    this.swap(index, index - 1);
  }

  moveDown(index: number) {
    if (index === this.images.length - 1) return;
    this.swap(index, index + 1);
  }

  private swap(i: number, j: number) {
    [this.images[i], this.images[j]] = [this.images[j], this.images[i]];
    this.persistOrder();
  }

  private persistOrder() {
    const orderedIds = this.images.map(img => img.id);
    this.http.post(`${this.api}/api/admin/gallery/reorder`, { orderedIds }).subscribe({
      error: () => {
        this.toast.error('Could not save the new order — refreshing the list.');
        this.loadImages();
      }
    });
  }

  trackById(_index: number, item: GalleryRow) {
    return item.id;
  }
}