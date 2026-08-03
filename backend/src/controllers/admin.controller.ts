import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess } from '../utils/ApiResponse';
import { AdminService } from '../services/admin.service';

export const dashboard = catchAsync(async (req: Request, res: Response) => {
  const data = await AdminService.dashboard();
  sendSuccess(res, data, 'Dashboard data fetched');
});

export const salesAnalytics = catchAsync(async (req: Request, res: Response) => {
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
  const data = await AdminService.salesAnalytics(days);
  sendSuccess(res, { series: data }, 'Sales analytics fetched');
});

export const topProducts = catchAsync(async (req: Request, res: Response) => {
  const data = await AdminService.topProducts();
  sendSuccess(res, { products: data }, 'Top products fetched');
});

export const listCustomers = catchAsync(async (req: Request, res: Response) => {
  const { items, meta } = await AdminService.listCustomers(req.query as any);
  sendSuccess(res, { customers: items }, 'Customers fetched', 200, meta);
});

export const setCustomerActive = catchAsync(async (req: Request, res: Response) => {
  const user = await AdminService.setCustomerActive(req.params.id, req.body.isActive);
  sendSuccess(res, { user }, 'Customer status updated');
});
