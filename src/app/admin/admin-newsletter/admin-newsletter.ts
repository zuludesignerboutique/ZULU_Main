import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterModule } from '@angular/router';

interface Subscriber {
  id: number;
  name: string;
  email: string;
  user_id: number | null;
  is_active: number;
  subscribed_at: string;
  unsubscribed_at: string | null;
  created_at: string;
  user_name: string | null;
  user_phone: string | null;
}

interface SubscribersResponse {
  subscribers: Subscriber[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

interface StatsResponse {
  total_users: number;
  subscribers: number;
  unsubscribed: number;
  active: number;
}

interface Campaign {
  id: number;
  name: string;
  subject: string;
  content_html: string;
  audience_type: string;
  audience_ids: number[];
  status: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_by: number;
  created_at: string;
  sent_at: string | null;
  creator_name: string | null;
}

interface CampaignsResponse {
  campaigns: Campaign[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

interface AudienceOption {
  value: string;
  label: string;
  description: string;
}

@Component({
  selector: 'app-admin-newsletter',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-newsletter.html',
  styleUrl: './admin-newsletter.scss'
})
export class AdminNewsletter implements OnInit {
  // Stats
  stats = {
    total_users: 0,
    subscribers: 0,
    unsubscribed: 0,
    active: 0
  };

  // Subscribers
  subscribers: Subscriber[] = [];
  totalSubscribers = 0;
  totalSubPages = 0;
  subPage = 1;
  subPageSize = 20;
  subSearchQuery = '';
  subStatusFilter = '';
  subLoading = false;
  subSearchDebounce: any;

  // Campaigns
  showCampaignModal = false;
  editingCampaign: Campaign | null = null;
  campaignName = '';
  campaignSubject = '';
  campaignContent = '';
  campaignAudienceType = 'all_subscribers';
  campaignAudienceIds: number[] = [];
  campaignLoading = false;
  selectAllChecked = false;
  selectedTemplate = 'blank';

  // Quill editor
  quill: any = null;

  // Audience options
  audienceOptions: AudienceOption[] = [
    { value: 'all_subscribers', label: 'All Newsletter Subscribers', description: 'Send to all active subscribers' },
    { value: 'selected', label: 'Selected Subscribers', description: 'Choose specific subscribers from the list' },
    { value: 'users_opted_in', label: 'Registered Users Who Opted In', description: 'Users with accounts who subscribed' }
  ];

  Math = Math;

  constructor(private http: HttpClient, private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadStats();
    this.loadSubscribers();
  }

  // Stats
  loadStats() {
    this.http.get<StatsResponse>('/api/admin/newsletter/stats').subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.stats = res;
          this.cdr.detectChanges();
        });
      },
      error: (err) => console.error('Failed to load newsletter stats:', err)
    });
  }

  // Subscribers
  loadSubscribers() {
    this.subLoading = true;
    const params = new URLSearchParams();
    params.set('page', this.subPage.toString());
    params.set('limit', this.subPageSize.toString());
    if (this.subSearchQuery.trim()) {
      params.set('search', this.subSearchQuery.trim());
    }
    if (this.subStatusFilter) {
      params.set('status', this.subStatusFilter);
    }

    this.http.get<SubscribersResponse>(`/api/admin/newsletter/subscribers?${params.toString()}`).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.subscribers = res.subscribers;
          this.totalSubscribers = res.total;
          this.totalSubPages = res.totalPages;
          this.subLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.subLoading = false;
          this.cdr.detectChanges();
        });
        console.error('Failed to load subscribers:', err);
      }
    });
  }

  onSubSearchInput() {
    clearTimeout(this.subSearchDebounce);
    this.subSearchDebounce = setTimeout(() => {
      this.subPage = 1;
      this.loadSubscribers();
    }, 400);
  }

  onSubStatusChange() {
    this.subPage = 1;
    this.loadSubscribers();
  }

  subPrevPage() {
    if (this.subPage > 1) {
      this.subPage--;
      this.loadSubscribers();
    }
  }

  subNextPage() {
    if (this.subPage < this.totalSubPages) {
      this.subPage++;
      this.loadSubscribers();
    }
  }

  getSubPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.subPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;

    if (end > this.totalSubPages) {
      end = this.totalSubPages;
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToSubPage(page: number) {
    if (page >= 1 && page <= this.totalSubPages && page !== this.subPage) {
      this.subPage = page;
      this.loadSubscribers();
    }
  }

  // Campaign Modal
  openCreateCampaign() {
    this.editingCampaign = null;
    this.campaignName = '';
    this.campaignSubject = '';
    this.campaignContent = '';
    this.campaignAudienceType = 'all_subscribers';
    this.campaignAudienceIds = [];
    this.showCampaignModal = true;
    setTimeout(() => this.initQuill(), 100);
  }

  closeCampaignModal() {
    this.showCampaignModal = false;
    this.destroyQuill();
  }

  initQuill() {
    if (this.quill) return;
    
    // Dynamic import for Quill
    import('quill').then(({ default: Quill }) => {
      this.quill = new Quill('#campaign-editor', {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link', 'image'],
            ['clean']
          ],
          clipboard: {
            matchVisual: false
          }
        },
        placeholder: 'Compose your campaign email...'
      });

      this.quill.on('text-change', () => {
        this.campaignContent = this.quill.root.innerHTML;
      });

      // Set initial content if editing
      if (this.editingCampaign) {
        this.quill.root.innerHTML = this.editingCampaign.content_html;
        this.campaignContent = this.editingCampaign.content_html;
      }
    });
  }

  destroyQuill() {
    if (this.quill) {
      this.quill = null;
    }
  }

  onTemplateChange(template: string) {
    const templates: Record<string, string> = {
      sale: `🔥 <strong>SPECIAL OFFER</strong> 🔥<br><br>Get up to <strong>30% OFF</strong><br><br>Shop our latest collection today.<br><br><div style="text-align:center;margin:24px 0;"><a href="#" style="background:#c8a96e;color:#1a1814;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">SHOP NOW</a></div>`,
      newArrival: `🆕 <strong>NEW COLLECTION ARRIVED</strong> 🆕<br><br>Explore our latest designs.<br><br><div style="text-align:center;margin:24px 0;"><a href="#" style="background:#c8a96e;color:#1a1814;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">VIEW COLLECTION</a></div>`,
      blank: ''
    };
    this.campaignContent = templates[template] || '';
    if (this.quill) {
      this.quill.root.innerHTML = this.campaignContent;
    }
  }

  onAudienceChange() {
    // Reset audience IDs when changing type
    if (this.campaignAudienceType !== 'selected') {
      this.campaignAudienceIds = [];
    }
  }

  toggleSubscriberSelection(subscriber: Subscriber) {
    if (this.campaignAudienceIds.includes(subscriber.id)) {
      this.campaignAudienceIds = this.campaignAudienceIds.filter(id => id !== subscriber.id);
    } else {
      this.campaignAudienceIds.push(subscriber.id);
    }
  }

  isSubscriberSelected(subscriber: Subscriber): boolean {
    return this.campaignAudienceIds.includes(subscriber.id);
  }

  toggleAllSubscribers() {
    if (this.campaignAudienceIds.length === this.subscribers.length) {
      this.campaignAudienceIds = [];
    } else {
      this.campaignAudienceIds = this.subscribers.map(s => s.id);
    }
  }

  allSubscribersSelected(): boolean {
    return this.campaignAudienceIds.length === this.subscribers.length && this.subscribers.length > 0;
  }

  // Campaign actions
  saveDraft() {
    if (!this.campaignName || !this.campaignSubject || !this.campaignContent) {
      alert('Please fill in all required fields');
      return;
    }
    this.campaignLoading = true;
    const data = {
      name: this.campaignName,
      subject: this.campaignSubject,
      content_html: this.campaignContent,
      audience_type: this.campaignAudienceType,
      audience_ids: this.campaignAudienceIds
    };

    if (this.editingCampaign) {
      this.http.patch(`/api/admin/newsletter/campaigns/${this.editingCampaign.id}`, data).subscribe({
        next: () => {
          this.campaignLoading = false;
          this.closeCampaignModal();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to update campaign:', err);
          this.campaignLoading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.http.post('/api/admin/newsletter/campaigns', data).subscribe({
        next: () => {
          this.campaignLoading = false;
          this.closeCampaignModal();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to create campaign:', err);
          this.campaignLoading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  sendTestEmail() {
    if (!this.campaignSubject || !this.campaignContent) {
      alert('Please fill in subject and content first');
      return;
    }
    const testEmail = prompt('Enter test email address:');
    if (!testEmail) return;

    this.http.post('/api/admin/newsletter/test', {
      subject: this.campaignSubject,
      content_html: this.campaignContent,
      to_email: testEmail
    }).subscribe({
      next: () => alert('Test email sent!'),
      error: (err) => {
        console.error('Test email failed:', err);
        alert('Failed to send test email');
      }
    });
  }

  previewCampaign() {
    if (!this.campaignSubject || !this.campaignContent) {
      alert('Please fill in subject and content first');
      return;
    }
    // Open preview in new window
    const previewWindow = window.open('', '_blank', 'width=600,height=800');
    if (previewWindow) {
      const frontendUrl = 'http://localhost:4101';
      const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=PREVIEW_TOKEN`;
      const html = this.buildPreviewHtml(this.campaignContent, unsubscribeUrl);
      previewWindow.document.write(html);
      previewWindow.document.close();
    }
  }

  buildPreviewHtml(contentHtml: string, unsubscribeUrl: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#faf8f5;font-family:'Georgia',serif;">
      <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="background:#0d0d0d;padding:32px 40px;text-align:center;">
          <h1 style="font-size:32px;color:#f0ece4;margin:0;letter-spacing:4px;font-weight:400;">ZULU</h1>
          <p style="font-size:11px;letter-spacing:2px;color:rgba(240,236,228,0.45);margin:8px 0 0;">DESIGNER BOUTIQUE</p>
        </div>
        <div style="height:3px;background:linear-gradient(90deg,#b76e79,#c8a96e,#b76e79);"></div>
        <div style="padding:32px 40px;">${contentHtml}</div>
        <div style="background:#faf8f5;padding:24px 40px;border-top:1px solid #efe8dd;text-align:center;">
          <p style="font-size:12px;color:#9a9080;margin:0 0 16px;">You're receiving this because you subscribed to Zulu Designer Boutique.</p>
          <a href="${unsubscribeUrl}" style="font-size:12px;color:#c8a96e;text-decoration:underline;">Unsubscribe</a>
        </div>
        <div style="background:#0d0d0d;padding:16px 40px;text-align:center;">
          <p style="font-size:11px;color:rgba(240,236,228,0.4);margin:0;">© 2025 ZULU Boutique</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  sendCampaign() {
    if (!this.campaignName || !this.campaignSubject || !this.campaignContent) {
      alert('Please fill in all required fields');
      return;
    }

    if (this.campaignAudienceType === 'selected' && this.campaignAudienceIds.length === 0) {
      alert('Please select at least one subscriber');
      return;
    }

    const confirmMsg = `Send campaign "${this.campaignName}" to ${this.getAudienceDescription()}?\n\nRecipients: ${this.getRecipientCount()}\n\nThis action cannot be undone.`;
    if (!confirm(confirmMsg)) return;

    this.campaignLoading = true;
    const data = {
      name: this.campaignName,
      subject: this.campaignSubject,
      content_html: this.campaignContent,
      audience_type: this.campaignAudienceType,
      audience_ids: this.campaignAudienceIds
    };

    // Save first, then send
    const saveOrUpdate = this.editingCampaign
      ? this.http.patch(`/api/admin/newsletter/campaigns/${this.editingCampaign.id}`, data)
      : this.http.post('/api/admin/newsletter/campaigns', data);

    saveOrUpdate.subscribe({
      next: (res: any) => {
        const campaignId = this.editingCampaign?.id || res.id;
        this.sendCampaignNow(campaignId);
      },
      error: (err) => {
        console.error('Failed to save campaign:', err);
        this.campaignLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  sendCampaignNow(campaignId: number) {
    this.http.post(`/api/admin/newsletter/campaigns/${campaignId}/send`, {
      audience_type: this.campaignAudienceType,
      audience_ids: this.campaignAudienceIds
    }).subscribe({
      next: (res: any) => {
        this.campaignLoading = false;
        this.closeCampaignModal();
        alert(`Campaign sent! Sent: ${res.sent}, Failed: ${res.failed}`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to send campaign:', err);
        this.campaignLoading = false;
        alert('Failed to send campaign');
        this.cdr.detectChanges();
      }
    });
  }

  getAudienceDescription(): string {
    const opt = this.audienceOptions.find(o => o.value === this.campaignAudienceType);
    return opt?.label || 'Unknown';
  }

  getRecipientCount(): number {
    if (this.campaignAudienceType === 'selected') {
      return this.campaignAudienceIds.length;
    }
    return this.stats.active; // approximate
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  getStatusBadgeClass(active: number): string {
    return active === 1 ? 'bg-success' : 'bg-secondary';
  }

  getStatusText(active: number): string {
    return active === 1 ? 'Active' : 'Unsubscribed';
  }
}