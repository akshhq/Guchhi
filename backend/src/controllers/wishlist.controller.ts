import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess } from '../utils/ApiResponse';
import { WishlistService } from '../services/wishlist.service';

export const getWishlist = catchAsync(async (req: Request, res: Response) => {
  const wishlist = await WishlistService.list(req.user!.id);
  sendSuccess(res, { wishlist }, 'Wishlist fetched');
});

export const addToWishlist = catchAsync(async (req: Request, res: Response) => {
  const item = await WishlistService.add(req.user!.id, req.body.productId);
  sendSuccess(res, { item }, 'Added to wishlist', 201);
});

export const removeFromWishlist = catchAsync(async (req: Request, res: Response) => {
  await WishlistService.remove(req.user!.id, req.params.productId);
  sendSuccess(res, {}, 'Removed from wishlist');
});

export const moveToCart = catchAsync(async (req: Request, res: Response) => {
  await WishlistService.moveToCart(req.user!.id, req.params.productId);
  sendSuccess(res, {}, 'Moved to cart');
});
