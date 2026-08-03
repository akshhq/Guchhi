import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess } from '../utils/ApiResponse';
import { ReviewService } from '../services/review.service';

export const listProductReviews = catchAsync(async (req: Request, res: Response) => {
  const reviews = await ReviewService.listForProduct(req.params.productId);
  sendSuccess(res, { reviews }, 'Reviews fetched');
});

export const createReview = catchAsync(async (req: Request, res: Response) => {
  const review = await ReviewService.create(req.user!.id, req.body.productId, req.body);
  sendSuccess(res, { review }, 'Review submitted and pending moderation', 201);
});

export const listPendingReviews = catchAsync(async (req: Request, res: Response) => {
  const reviews = await ReviewService.listPendingForAdmin();
  sendSuccess(res, { reviews }, 'Pending reviews fetched');
});

export const moderateReview = catchAsync(async (req: Request, res: Response) => {
  const review = await ReviewService.moderate(req.params.id, req.body.isApproved);
  sendSuccess(res, { review }, 'Review moderated');
});

export const deleteReview = catchAsync(async (req: Request, res: Response) => {
  await ReviewService.remove(req.params.id);
  sendSuccess(res, {}, 'Review deleted');
});
