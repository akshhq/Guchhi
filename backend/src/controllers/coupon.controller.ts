import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess } from '../utils/ApiResponse';
import { CouponService } from '../services/coupon.service';

export const listCoupons = catchAsync(async (req: Request, res: Response) => {
  const coupons = await CouponService.list();
  sendSuccess(res, { coupons }, 'Coupons fetched');
});

export const createCoupon = catchAsync(async (req: Request, res: Response) => {
  const coupon = await CouponService.create(req.body);
  sendSuccess(res, { coupon }, 'Coupon created', 201);
});

export const updateCoupon = catchAsync(async (req: Request, res: Response) => {
  const coupon = await CouponService.update(req.params.id, req.body);
  sendSuccess(res, { coupon }, 'Coupon updated');
});

export const deleteCoupon = catchAsync(async (req: Request, res: Response) => {
  await CouponService.remove(req.params.id);
  sendSuccess(res, {}, 'Coupon deleted');
});
