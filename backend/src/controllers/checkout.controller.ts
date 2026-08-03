import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess } from '../utils/ApiResponse';
import { CheckoutService } from '../services/checkout.service';
import { ApiError } from '../utils/ApiError';

function requireActor(req: Request) {
  if (!req.cartActor) throw ApiError.badRequest('Provide an x-guest-id header or log in to check out');
  return req.cartActor;
}

export const getSummary = catchAsync(async (req: Request, res: Response) => {
  const summary = await CheckoutService.summary(requireActor(req), req.body);
  sendSuccess(res, { summary }, 'Checkout summary calculated');
});

export const createRazorpayOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await CheckoutService.createRazorpayOrder(requireActor(req), req.body);
  sendSuccess(res, result, 'Razorpay order created', 201);
});

export const verifyPayment = catchAsync(async (req: Request, res: Response) => {
  const { checkoutId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const order = await CheckoutService.verifyAndCreateOrder(
    checkoutId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );
  sendSuccess(res, { order }, 'Payment verified and order placed', 201);
});

export const createCodOrder = catchAsync(async (req: Request, res: Response) => {
  const order = await CheckoutService.createCodOrder(requireActor(req), req.body);
  sendSuccess(res, { order }, 'Order placed (Cash on Delivery)', 201);
});
