import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { GalleryImage } from '../core/models/gallery.model';

// Shape returned by GET /api/gallery
interface GalleryRow {
  id: number;
  title: string;
  description: string;
  image_url: string;
  display_order: number;
}

@Injectable({
  providedIn: 'root'
})
export class GalleryService {

  constructor(private http: HttpClient) {}

  getGalleryImages(): Observable<GalleryImage[]> {
    return this.http.get<GalleryRow[]>('/api/gallery').pipe(
      map(rows => rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description ?? '',
        imageUrl: row.image_url
      })))
    );
  }
}
