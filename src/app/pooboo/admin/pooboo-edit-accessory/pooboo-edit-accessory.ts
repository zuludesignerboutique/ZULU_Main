import { Component, NgZone, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PoobooAccessoryService } from '../../services/pooboo-accessory.service';
import { ToastService } from '../../../services/toast.service';
import { ImageUploadService } from '../../../services/image-upload.service';

interface NewImage { file: File; preview: string; label: string; }

type AccessoryTab = 'baby-ornaments' | 'bands' | 'hair-clips';

@Component({
  selector: 'app-pooboo-edit-accessory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pooboo-edit-accessory.html',
  styleUrl: './pooboo-edit-accessory.scss'
})
export class PoobooEditAccessory implements OnInit {

  private api = '';
  private productId!: number;

  loading = true;
  error   = '';

  tabs: { key: AccessoryTab; label: string; emoji: string }[] = [
    { key: 'baby-ornaments', label: 'Baby Ornaments', emoji: '🌟' },
    { key: 'bands',          label: 'Bands',          emoji: '💛' },
    { key: 'hair-clips',     label: 'Hair Clips',     emoji: '🩷' },
  ];

  a_name              = '';
  a_description       = '';
  a_price             = '';
  a_stock             = '';
  a_balance_stock     = '';
  a_product_code      = '';
  a_colour            = '';
  a_accessoryCategory : AccessoryTab = 'baby-ornaments';

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

  presetTags     = ['New', 'Bestseller', 'Sale'];
  selectedTags   : string[] = [];
  customTagInput = '';

  submitting = false;
  successMsg = '';
  errorMsg   = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private accessoryService: PoobooAccessoryService,
    private toast: ToastService,
    private imageUpload: ImageUploadService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) { this.error = 'No accessory id provided'; this.loading = false; return; }
    this.productId = +idParam;
    this.loadAccessory();
  }

  loadAccessory() {
    if (!isPlatformBrowser(this.platformId)) { this.loading = false; return; }
    this.loading = true;
    this.http.get<any>(`${this.api}/api/pooboo/accessories/${this.productId}`).subscribe({
      next: (p) => {
        this.zone.run(() => {
          this.a_name              = p.name ?? '';
          this.a_description       = p.description ?? '';
          this.a_price             = p.price ?? '';
          this.a_stock             = p.stock ?? '';
          this.a_balance_stock     = p.balance_stock ?? '';
          this.a_product_code      = p.product_code ?? '';
          this.a_colour            = p.colour ?? '';
          this.a_accessoryCategory = (p.accessory_type as AccessoryTab) ?? 'baby-ornaments';
          this.selectedTags        = Array.isArray(p.tags) ? [...p.tags] : [];
          this.existingImages = Array.isArray(p.images) ? [...p.images].sort((a:any,b:any)=>a.display_order-b.display_order) : [];
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => { this.error='Failed to load accessory'; this.loading=false; this.cdr.detectChanges(); });
      }
    });
  }

  async onNewFilesChange(event:any){
    const input=event.target as HTMLInputElement;
    const files=Array.from(input.files||[]);
    if(!files.length) return;
    const remaining=this.maxImages - this.totalImageCount;
    if(remaining<=0){ this.setImageMsg(`You can upload a maximum of ${this.maxImages} images per accessory.`, true); input.value=''; this.zone.run(()=>this.cdr.detectChanges()); return; }
    const toAdd=files.slice(0,remaining);
    if(toAdd.length < files.length) this.setImageMsg(`Only ${this.maxImages} images are allowed per accessory. ${toAdd.length} image(s) added.`, true); else this.imageMsg='';
    try {
      const compressed = await this.imageUpload.compressAndPreview(toAdd);
      compressed.forEach(c=> this.newImages.push({ file: c.file, preview: c.preview, label: '' }));
    } catch {
      toAdd.forEach(file=>{
        const reader=new FileReader();
        reader.onload=(e:any)=>{ this.newImages.push({ file, preview: e.target.result, label: '' }); this.zone.run(()=>this.cdr.detectChanges()); };
        reader.readAsDataURL(file);
      });
    }
    input.value=''; this.zone.run(()=>this.cdr.detectChanges());
  }
  removeNewImage(index:number){ this.newImages.splice(index,1); this.imageMsg=''; this.zone.run(()=>this.cdr.detectChanges()); }
  addPendingImages(){
    if(!this.newImages.length || !this.productId) return;
    this.imageBusy=true; this.imageMsg=''; this.imageMsgError=false;
    this.uploadPendingImages(this.productId).subscribe({
      next: ()=>{ this.imageBusy=false; this.newImages=[]; this.setImageMsg('Image(s) added successfully.', false); this.reloadGallery(); },
      error: (err)=>{ this.imageBusy=false; this.setImageMsg(this.imageUpload.extractUploadError(err), true); }
    });
  }
  private uploadPendingImages(productId:number){ return this.accessoryService.addImages(productId, this.newImages.map(n=>n.file), this.newImages.map(n=>n.label)); }
  async deleteImage(image:any){
    if(!this.productId || !image?.id) return;
    const confirmed=await this.toast.confirm({ title: 'Delete image?', message: 'Delete this image? This can\'t be undone.', confirmLabel: 'Delete' });
    if(!confirmed) return;
    this.imageBusy=true; this.imageMsg=''; this.imageMsgError=false;
    this.accessoryService.deleteImage(this.productId, image.id).subscribe({
      next: ()=>{ this.imageBusy=false; this.existingImages=this.existingImages.filter(i=>i.id!==image.id); this.setImageMsg('Image deleted successfully.', false); this.zone.run(()=>this.cdr.detectChanges()); },
      error: (err)=>{ this.imageBusy=false; this.setImageMsg(this.imageUpload.extractUploadError(err), true); }
    });
  }
  moveImage(index:number, direction:-1|1){
    const target=index+direction; if(target<0||target>=this.existingImages.length) return;
    const arr=[...this.existingImages]; [arr[index],arr[target]]=[arr[target],arr[index]]; this.existingImages=arr; this.saveOrderAndLabels();
  }
  saveOrderAndLabels(){
    if(!this.productId || !this.existingImages.length) return;
    const orderedIds=this.existingImages.map(i=>i.id);
    const labels:Record<number,string>={}; this.existingImages.forEach(i=>{ labels[i.id]=i.label||''; });
    this.imageBusy=true; this.imageMsg=''; this.imageMsgError=false;
    this.accessoryService.reorderImages(this.productId, orderedIds, labels).subscribe({
      next: ()=>{ this.imageBusy=false; this.setImageMsg('Image order saved.', false); this.zone.run(()=>this.cdr.detectChanges()); },
      error: (err)=>{ this.imageBusy=false; this.setImageMsg(this.imageUpload.extractUploadError(err), true); }
    });
  }
  private reloadGallery(){
    this.http.get<any>(`${this.api}/api/pooboo/accessories/${this.productId}`).subscribe(data=>{
      this.existingImages=Array.isArray(data.images)?[...data.images].sort((a:any,b:any)=>a.display_order-b.display_order):[];
      this.zone.run(()=>this.cdr.detectChanges());
    });
  }
  private setImageMsg(msg:string,isError:boolean){ this.imageMsg=msg; this.imageMsgError=isError; this.zone.run(()=>this.cdr.detectChanges()); }

  togglePresetTag(tag: string) {
    this.selectedTags = this.selectedTags.includes(tag) ? this.selectedTags.filter(t => t !== tag) : [...this.selectedTags, tag];
  }
  isTagSelected(tag: string): boolean { return this.selectedTags.includes(tag); }
  addCustomTag() { const tag = this.customTagInput.trim(); if (tag && !this.selectedTags.includes(tag)) this.selectedTags = [...this.selectedTags, tag]; this.customTagInput=''; }
  removeTag(tag: string) { this.selectedTags = this.selectedTags.filter(t => t !== tag); }

  saveAccessory() {
    if (!this.a_name || !this.a_price) { this.errorMsg = 'Name and price are required.'; return; }
    this.submitting = true; this.errorMsg=''; this.successMsg='';
    const formData = new FormData();
    formData.append('name',           this.a_name);
    formData.append('description',    this.a_description);
    formData.append('price',          this.a_price);
    formData.append('accessory_type', this.a_accessoryCategory);
    formData.append('stock',          this.a_stock);
    formData.append('balance_stock',  this.a_balance_stock);
    formData.append('product_code',   this.a_product_code);
    formData.append('colour',         this.a_colour);
    formData.append('tags',           JSON.stringify(this.selectedTags));
    this.http.put(`${this.api}/api/pooboo/accessories/${this.productId}`, formData).subscribe({
      next: () => {
        if (this.newImages.length) {
          this.uploadPendingImages(this.productId).subscribe({
            next: ()=>{ this.zone.run(()=>{ this.successMsg='✅ Accessory updated successfully!'; this.submitting=false; this.cdr.detectChanges(); setTimeout(()=>this.router.navigate(['/admin/pooboo/accessories']),800); }); },
            error: (err)=>{ this.zone.run(()=>{ this.submitting=false; this.toast.error('Accessory details were saved, but the new images failed to upload: ' + this.imageUpload.extractUploadError(err)); this.cdr.detectChanges(); }); }
          });
          return;
        }
        this.zone.run(()=>{ this.successMsg='✅ Accessory updated successfully!'; this.submitting=false; this.cdr.detectChanges(); setTimeout(()=>this.router.navigate(['/admin/pooboo/accessories']),800); });
      },
      error: () => { this.zone.run(()=>{ this.errorMsg='❌ Failed to update accessory. Please try again.'; this.submitting=false; this.cdr.detectChanges(); }); }
    });
  }

  cancel() { this.router.navigate(['/admin/pooboo/accessories']); }
  getImageUrl(img: string | null): string { if (!img) return 'assets/images/placeholder.png'; return img.startsWith('http') ? img : `${this.api}/uploads/${img}`; }
}
