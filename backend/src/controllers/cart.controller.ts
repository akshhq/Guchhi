import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess } from '../utils/ApiResponse';
import { CartService } from '../services/cart.service';
import { ApiError } from '../utils/ApiError';

function requireActor(req: Request) {
  if (!req.cartActor) throw ApiError.badRequest('Provide an x-guest-id header or log in to use the cart');
  return req.cartActor;
}

export const getCart = catchAsync(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const cart = await CartService.getCart(actor);
  sendSuccess(res, { cart }, 'Cart fetched');
});

export const addItem = catchAsync(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const cart = await CartService.addItem(actor, req.body.productId, req.body.quantity ?? 1);
  sendSuccess(res, { cart }, 'Item added to cart', 201);
});

export const updateItem = catchAsync(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const cart = await CartService.updateItem(actor, req.params.productId, req.body.quantity);
  sendSuccess(res, { cart }, 'Cart item updated');
});

export const removeItem = catchAsync(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const cart = await CartService.removeItem(actor, req.params.productId);
  sendSuccess(res, { cart }, 'Item removed from cart');
});

export const clearCart = catchAsync(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const cart = await CartService.clearCart(actor);
  sendSuccess(res, { cart }, 'Cart cleared');
});

export const applyCoupon = catchAsync(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const cart = await CartService.applyCoupon(actor, req.body.code);
  sendSuccess(res, { cart }, 'Coupon applied');
});

export const removeCoupon = catchAsync(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const cart = await CartService.removeCoupon(actor);
  sendSuccess(res, { cart }, 'Coupon removed');
});
