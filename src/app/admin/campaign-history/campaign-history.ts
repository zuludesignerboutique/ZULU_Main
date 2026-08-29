import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

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

@Component({
  selector: 'app-campaign-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './campaign-history.html',
  styleUrl: './campaign-history.scss'
})
export class CampaignHistory implements OnInit {
  campaigns: Campaign[] = [];
  totalCampaigns = 0;
  totalPages = 0;
  currentPage = 1;
  pageSize = 20;
  loading = false;

  selectedCampaign: Campaign | null = null;
  showDetailModal = false;

  Math = Math;

  constructor(private http: HttpClient, private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadCampaigns();
  }

  loadCampaigns() {
    this.loading = true;
    const params = new URLSearchParams();
    params.set('page', this.currentPage.toString());
    params.set('limit', this.pageSize.toString());

    this.http.get<CampaignsResponse>(`/api/admin/newsletter/campaigns?${params.toString()}`).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.campaigns = res.campaigns;
          this.totalCampaigns = res.total;
          this.totalPages = res.totalPages;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loading = false;
          this.cdr.detectChanges();
        });
        console.error('Failed to load campaigns:', err);
      }
    });
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadCampaigns();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadCampaigns();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;

    if (end > this.totalPages) {
      end = this.totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadCampaigns();
    }
  }

  openCampaignDetail(campaign: Campaign) {
    this.selectedCampaign = campaign;
    this.showDetailModal = true;
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedCampaign = null;
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      draft: 'bg-secondary',
      sending: 'bg-warning text-dark',
      sent: 'bg-success',
      failed: 'bg-danger',
      cancelled: 'bg-secondary'
    };
    return map[status] || 'bg-secondary';
  }

  getStatusText(status: string): string {
    const map: Record<string, string> = {
      draft: 'Draft',
      sending: 'Sending',
      sent: 'Sent',
      failed: 'Failed',
      cancelled: 'Cancelled'
    };
    return map[status] || status;
  }

  getAudienceText(campaign: Campaign): string {
    const map: Record<string, string> = {
      all_subscribers: 'All Subscribers',
      selected: 'Selected',
      users_opted_in: 'Users Opted In'
    };
    return map[campaign.audience_type] || campaign.audience_type;
  }
}