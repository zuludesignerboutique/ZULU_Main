import { Component, OnInit, NgZone, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

interface Subscriber {
  id: number;
  name: string;
  email: string;
  user_id: number | null;
  is_active: number;
  subscribed_at: string;
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
}

@Component({
  selector: 'app-campaign-composer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './campaign-composer.html',
  styleUrl: './campaign-composer.scss'
})
export class CampaignComposer implements OnInit {
  @Input() campaign: Campaign | null = null;
  @Input() subscribers: Subscriber[] = [];
  @Input() stats: any = { active: 0 };

  @Output() save = new EventEmitter<any>();
  @Output() send = new EventEmitter<any>();
  @Output() test = new EventEmitter<any>();
  @Output() preview = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  campaignName = '';
  campaignSubject = '';
  campaignContent = '';
  campaignAudienceType = 'all_subscribers';
  campaignAudienceIds: number[] = [];
  campaignLoading = false;
  selectAllChecked = false;

  quill: any = null;
  selectedTemplate = 'blank';

  audienceOptions = [
    { value: 'all_subscribers', label: 'All Newsletter Subscribers', description: 'Send to all active subscribers' },
    { value: 'selected', label: 'Selected Subscribers', description: 'Choose specific subscribers from the list' },
    { value: 'users_opted_in', label: 'Registered Users Who Opted In', description: 'Users with accounts who subscribed' }
  ];

  Math = Math;

  constructor(private http: HttpClient, private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    if (this.campaign) {
      this.campaignName = this.campaign.name;
      this.campaignSubject = this.campaign.subject;
      this.campaignContent = this.campaign.content_html;
      this.campaignAudienceType = this.campaign.audience_type;
      this.campaignAudienceIds = this.campaign.audience_ids || [];
    }
    setTimeout(() => this.initQuill(), 100);
  }

  ngOnDestroy() {
    this.destroyQuill();
  }

  initQuill() {
    if (this.quill) return;
    
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

      if (this.campaign) {
        this.quill.root.innerHTML = this.campaign.content_html;
        this.campaignContent = this.campaign.content_html;
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
    this.selectedTemplate = template;
  }

  getAudienceOption(value: string) {
    return this.audienceOptions.find(o => o.value === value);
  }

  onAudienceChange() {
    if (this.campaignAudienceType !== 'selected') {
      this.campaignAudienceIds = [];
    }
  }

  toggleSubscriberSelection(event: any, subscriber: Subscriber) {
    const checked = event.target.checked;
    if (checked) {
      this.campaignAudienceIds.push(subscriber.id);
    } else {
      this.campaignAudienceIds = this.campaignAudienceIds.filter(id => id !== subscriber.id);
    }
  }

  isSubscriberSelected(subscriber: Subscriber): boolean {
    return this.campaignAudienceIds.includes(subscriber.id);
  }

  toggleAllSubscribers(event: any) {
    const checked = event.target.checked;
    if (checked) {
      this.campaignAudienceIds = this.subscribers.map(s => s.id);
    } else {
      this.campaignAudienceIds = [];
    }
  }

  allSubscribersSelected(): boolean {
    return this.campaignAudienceIds.length === this.subscribers.length && this.subscribers.length > 0;
  }

  getAudienceDescription(): string {
    const opt = this.audienceOptions.find(o => o.value === this.campaignAudienceType);
    return opt?.label || 'Unknown';
  }

  getRecipientCount(): number {
    if (this.campaignAudienceType === 'selected') {
      return this.campaignAudienceIds.length;
    }
    return this.stats.active;
  }

  onSave() {
    if (!this.campaignName || !this.campaignSubject || !this.campaignContent) {
      alert('Please fill in all required fields');
      return;
    }
    if (this.campaignAudienceType === 'selected' && this.campaignAudienceIds.length === 0) {
      alert('Please select at least one subscriber');
      return;
    }

    this.save.emit({
      name: this.campaignName,
      subject: this.campaignSubject,
      content_html: this.campaignContent,
      audience_type: this.campaignAudienceType,
      audience_ids: this.campaignAudienceIds
    });
  }

  onSend() {
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

    this.send.emit({
      name: this.campaignName,
      subject: this.campaignSubject,
      content_html: this.campaignContent,
      audience_type: this.campaignAudienceType,
      audience_ids: this.campaignAudienceIds
    });
  }

  onTest() {
    if (!this.campaignSubject || !this.campaignContent) {
      alert('Please fill in subject and content first');
      return;
    }
    const testEmail = prompt('Enter test email address:');
    if (!testEmail) return;

    this.test.emit({
      subject: this.campaignSubject,
      content_html: this.campaignContent,
      to_email: testEmail
    });
  }

  onPreview() {
    if (!this.campaignSubject || !this.campaignContent) {
      alert('Please fill in subject and content first');
      return;
    }
    this.preview.emit({ subject: this.campaignSubject, content_html: this.campaignContent });
  }

  onClose() {
    this.close.emit();
  }
}