import { Component, NgZone, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PoobooFabricService } from '../../services/pooboo-fabric.service';
import { ToastService } from '../../../services/toast.service';

interface NewImage { file: File; preview: string; label: string; }

@Component({
  selector: 'app-pooboo-edit-fabric',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pooboo-edit-fabric.html',
  styleUrl: './pooboo-edit-fabric.scss'
})
export class PoobooEditFabric implements OnInit {

  private api = '';
  private productId!: number;

  loading = true;
  error   = '';

  f_name            = '';
  f_fabric_type     = '';
  f_description     = '';
  f_price_per_meter = '';
  f_total_meters    = '';
  f_balance_stock   = '';
  f_product_code    = '';
  f_colour          = '';

  f_tags: string[] = [];
  f_customTag = '';
  presetTags = ['New', 'Bestseller', 'Sale'];

  readonly maxImages = 4;
  readonly imageLabels = ['Front', 'Back', 'Side', 'Full'];
  existingImages: any[] = [];
  newImages: NewImage[] = [];
  imageBusy = false;
  imageMsg = '';
  imageMsgError = false;
  imageBase = '/uploads/';

  get totalImageCount(): number { return this.existingImages.length + this.newImages.length; }
  get canAddMoreImages(): boolean { return this.totalImageCount < this.maxImages; }

  fabricTypes = [
    { label: 'Cotton',     value: 'cotton',     emoji: '🌿' },
    { label: 'Silk',       value: 'silk',        emoji: '✨' },
    { label: 'Linen',      value: 'linen',       emoji: '🍃' },
    { label: 'Georgette',  value: 'georgette',   emoji: '🌸' },
    { label: 'Net',        value: 'net',         emoji: '🕸️' },
    { label: 'Velvet',     value: 'velvet',      emoji: '💜' },
    {label: 'satin',      value: 'satin',       emoji: '💫' },
  ];

  submitting = false;
  successMsg = '';
  errorMsg   = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private fabricService: PoobooFabricService,
    private toast: ToastService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) { this.error = 'No fabric id provided'; this.loading = false; return; }
    this.productId = +idParam;
    this.loadFabric();
  }

  loadFabric() {
    if (!isPlatformBrowser(this.platformId)) { this.loading = false; return; }
    this.loading = true;
    this.http.get<any>(`${this.api}/api/pooboo/fabrics/${this.productId}`).subscribe({
      next: (p) => {
        this.zone.run(() => {
          this.f_name            = p.name ?? '';
          this.f_fabric_type     = p.fabric_type ?? '';
          this.f_description     = p.description ?? '';
          this.f_price_per_meter = p.price_per_meter ?? '';
          this.f_total_meters    = p.total_meters ?? '';
          this.f_balance_stock   = p.balance_stock ?? '';
          this.f_product_code    = p.product_code ?? '';
          this.f_colour          = p.colour ?? '';
          this.f_tags            = Array.isArray(p.tags) ? p.tags : [];
          this.existingImages = Array.isArray(p.images) ? [...p.images].sort((a:any,b:any)=>a.display_order-b.display_order) : [];
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => { this.error = 'Failed to load fabric'; this.loading = false; this.cdr.detectChanges(); });
      }
    });
  }

  togglePresetTag(tag: string) {
    const i = this.f_tags.indexOf(tag);
    if (i > -1) this.f_tags.splice(i, 1); else this.f_tags.push(tag);
  }
  addCustomTag() { const t = this.f_customTag.trim(); if (t && !this.f_tags.includes(t)) this.f_tags.push(t); this.f_customTag=''; }
  removeTag(tag: string) { this.f_tags = this.f_tags.filter(t=>t!==tag); }

  onNewFilesChange(event: any) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    const remaining = this.maxImages - this.totalImageCount;
    if (remaining <=0) { this.setImageMsg(`You can upload a maximum of ${this.maxImages} images per fabric.`, true); input.value=''; this.zone.run(()=>this.cdr.detectChanges()); return; }
    const toAdd = files.slice(0, remaining);
    if (toAdd.length < files.length) this.setImageMsg(`Only ${this.maxImages} images are allowed per fabric. ${toAdd.length} image(s) added.`, true); else this.imageMsg='';
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e:any) => { this.newImages.push({ file, preview: e.target.result, label: '' }); this.zone.run(()=>this.cdr.detectChanges()); };
      reader.readAsDataURL(file);
    });
    input.value=''; this.zone.run(()=>this.cdr.detectChanges());
  }
  removeNewImage(index:number){ this.newImages.splice(index,1); this.imageMsg=''; this.zone.run(()=>this.cdr.detectChanges()); }
  addPendingImages(){
    if (!this.newImages.length || !this.productId) return;
    this.imageBusy=true; this.imageMsg=''; this.imageMsgError=false;
    this.uploadPendingImages(this.productId).subscribe({
      next: ()=>{ this.imageBusy=false; this.newImages=[]; this.setImageMsg('Image(s) added successfully.', false); this.reloadGallery(); },
      error: (err)=>{ this.imageBusy=false; this.setImageMsg(err?.error?.error || 'Failed to add images. Please try again.', true); }
    });
  }
  private uploadPendingImages(productId:number){ return this.fabricService.addImages(productId, this.newImages.map(n=>n.file), this.newImages.map(n=>n.label)); }
  async deleteImage(image:any){
    if (!this.productId || !image?.id) return;
    const confirmed = await this.toast.confirm({ title: 'Delete image?', message: 'Delete this image? This can\'t be undone.', confirmLabel: 'Delete' });
    if (!confirmed) return;
    this.imageBusy=true; this.imageMsg=''; this.imageMsgError=false;
    this.fabricService.deleteImage(this.productId, image.id).subscribe({
      next: ()=>{ this.imageBusy=false; this.existingImages=this.existingImages.filter(i=>i.id!==image.id); this.setImageMsg('Image deleted successfully.', false); this.zone.run(()=>this.cdr.detectChanges()); },
      error: (err)=>{ this.imageBusy=false; this.setImageMsg(err?.error?.error || 'Failed to delete image. Please try again.', true); }
    });
  }
  moveImage(index:number, direction:-1|1){
    const target=index+direction; if (target<0 || target>=this.existingImages.length) return;
    const arr=[...this.existingImages]; [arr[index],arr[target]]=[arr[target],arr[index]]; this.existingImages=arr; this.saveOrderAndLabels();
  }
  saveOrderAndLabels(){
    if (!this.productId || !this.existingImages.length) return;
    const orderedIds=this.existingImages.map(i=>i.id);
    const labels:Record<number,string>={}; this.existingImages.forEach(i=>{ labels[i.id]=i.label||''; });
    this.imageBusy=true; this.imageMsg=''; this.imageMsgError=false;
    this.fabricService.reorderImages(this.productId, orderedIds, labels).subscribe({
      next: ()=>{ this.imageBusy=false; this.setImageMsg('Image order saved.', false); this.zone.run(()=>this.cdr.detectChanges()); },
      error: (err)=>{ this.imageBusy=false; this.setImageMsg(err?.error?.error || 'Failed to save image order.', true); }
    });
  }
  private reloadGallery(){
    this.http.get<any>(`${this.api}/api/pooboo/fabrics/${this.productId}`).subscribe(data=>{
      this.existingImages=Array.isArray(data.images)?[...data.images].sort((a:any,b:any)=>a.display_order-b.display_order):[];
      this.zone.run(()=>this.cdr.detectChanges());
    });
  }
  private setImageMsg(msg:string,isError:boolean){ this.imageMsg=msg; this.imageMsgError=isError; this.zone.run(()=>this.cdr.detectChanges()); }

  saveFabric() {
    if (!this.f_name || !this.f_price_per_meter || !this.f_fabric_type) {
      this.errorMsg = 'Name, price, and fabric type are required.';
      return;
    }
    this.submitting = true;
    this.errorMsg=''; this.successMsg='';
    const formData = new FormData();
    formData.append('name',            this.f_name);
    formData.append('fabric_type',     this.f_fabric_type);
    formData.append('description',     this.f_description);
    formData.append('price_per_meter', this.f_price_per_meter);
    formData.append('total_meters',    this.f_total_meters);
    formData.append('balance_stock',   this.f_balance_stock);
    formData.append('product_code',    this.f_product_code);
    formData.append('colour',          this.f_colour);
    formData.append('tags',            JSON.stringify(this.f_tags));
    this.http.put(`${this.api}/api/pooboo/fabrics/${this.productId}`, formData).subscribe({
      next: () => {
        if (this.newImages.length) {
          this.uploadPendingImages(this.productId).subscribe({
            next: ()=>{
              this.zone.run(()=>{ this.successMsg='✅ Fabric updated successfully!'; this.submitting=false; this.cdr.detectChanges(); setTimeout(()=>this.router.navigate(['/admin/pooboo/fabrics']),800); });
            },
            error: (err)=>{
              this.zone.run(()=>{ this.submitting=false; this.toast.error('Fabric details were saved, but the new images failed to upload: ' + (err?.error?.error || 'please try "Upload new images" again.')); this.cdr.detectChanges(); });
            }
          });
          return;
        }
        this.zone.run(()=>{ this.successMsg='✅ Fabric updated successfully!'; this.submitting=false; this.cdr.detectChanges(); setTimeout(()=>this.router.navigate(['/admin/pooboo/fabrics']),800); });
      },
      error: () => { this.zone.run(()=>{ this.errorMsg='❌ Failed to update fabric. Please try again.'; this.submitting=false; this.cdr.detectChanges(); }); }
    });
  }

  cancel() { this.router.navigate(['/admin/pooboo/fabrics']); }
  getImageUrl(img: string | null): string { if (!img) return 'assets/images/placeholder.png'; return img.startsWith('http') ? img : `${this.api}/uploads/${img}`; }
}
