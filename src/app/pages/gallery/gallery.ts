import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryService } from '../../services/gallery.service';
import { GalleryImage } from '../../core/models/gallery.model';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gallery.html',
  styleUrl: './gallery.scss',
})
export class Gallery implements OnInit {

  images: GalleryImage[] = [];

  constructor(private galleryService: GalleryService) {}
  trackById(index: number, item: any) {
  return item.id || item.imageUrl;
}

  ngOnInit(): void {
    this.galleryService.getGalleryImages()
      .subscribe((data: GalleryImage[]) => {
        this.images = data;
      });
  }
}
