import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../services/review.service';
import { Review } from '../../core/models/review.model';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reviews.html',
  styleUrl: './reviews.scss',
})
export class Reviews implements OnInit {

  reviews: Review[] = [];

  newReview: Review = {
    id: 0,
    name: '',
    rating: 5,
    comment: ''
  };

  constructor(private reviewService: ReviewService) {}

  ngOnInit(): void {
    this.reviewService.getReviews().subscribe(data => {
      this.reviews = data;
    });
  }

  submitReview(): void {
    if (!this.newReview.name || !this.newReview.comment) return;

    const reviewToAdd: Review = {
      ...this.newReview,
      id: Date.now(),
      createdAt: new Date()
    };

    this.reviewService.addReview(reviewToAdd);

    this.newReview = {
      id: 0,
      name: '',
      rating: 5,
      comment: ''
    };
  }
}
