import { Injectable } from '@angular/core';
import { NgZone } from '@angular/core';

export interface CompressedImage {
  file: File;
  preview: string;
}

@Injectable({ providedIn: 'root' })
export class ImageUploadService {
  private readonly MAX_DIM = 1600;
  private readonly QUALITY = 0.82;
  private readonly SKIP_COMPRESS_BYTES = 300 * 1024;

  constructor(private ngZone: NgZone) {}

  async compressImage(file: File): Promise<File> {
    if (!file.type.startsWith('image/') || file.size < this.SKIP_COMPRESS_BYTES) {
      return file;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        let { width, height } = img;
        if (width > this.MAX_DIM || height > this.MAX_DIM) {
          const scale = this.MAX_DIM / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context unavailable')); return; }

        if (file.type === 'image/png' || file.type === 'image/webp') {
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(blob => {
          if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
          if (blob.size >= file.size) { resolve(file); return; }
          const compressed = new File(
            [blob],
            file.name.replace(/\.\w+$/, '') + '.jpg',
            { type: 'image/jpeg' }
          );
          resolve(compressed);
        }, 'image/jpeg', this.QUALITY);
      };

      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image decode failed')); };
      img.src = url;
    });
  }

  async compressAndPreview(files: File[]): Promise<CompressedImage[]> {
    const results = await Promise.all(
      files.map(async f => {
        let compressed = f;
        try { compressed = await this.compressImage(f); } catch { /* fall back to original */ }
        const preview = await this.toDataURL(compressed);
        return { file: compressed, preview };
      })
    );
    return results;
  }

  private toDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  extractUploadError(err: any): string {
    const backendMsg = err?.error?.error;
    if (typeof backendMsg === 'string' && backendMsg) return backendMsg;
    if (err?.status === 413) return 'Image too large — please try a smaller image or fewer at once.';
    if (typeof err?.error === 'string' && err.error && !err.error.startsWith('<')) return err.error;
    return 'Failed to upload images. Please try again.';
  }
}