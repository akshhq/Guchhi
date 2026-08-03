import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess } from '../utils/ApiResponse';
import { OrderService } from '../services/order.service';
import { RefundService } from '../services/refund.service';

export const listMyOrders = catchAsync(async (req: Request, res: Response) => {
  const { items, meta } = await OrderService.listForUser(req.user!.id, req.query as any);
  sendSuccess(res, { orders: items }, 'Orders fetched', 200, meta);
});

export const getMyOrder = catchAsync(async (req: Request, res: Response) => {
  const order = await OrderService.getById(req.params.id, req.user!.id);
  sendSuccess(res, { order }, 'Order fetched');
});

export const cancelMyOrder = catchAsync(async (req: Request, res: Response) => {
  const order = await OrderService.cancel(req.params.id, req.user!.id, req.body.reason);
  sendSuccess(res, { order }, 'Order cancelled');
});

export const getInvoice = catchAsync(async (req: Request, res: Response) => {
  const invoice = await OrderService.getInvoiceData(req.params.id);
  sendSuccess(res, { invoice }, 'Invoice generated');
});

// ---------------- Admin ----------------

export const listAllOrders = catchAsync(async (req: Request, res: Response) => {
  const { items, meta } = await OrderService.listAllForAdmin(req.query as any);
  sendSuccess(res, { orders: items }, 'Orders fetched', 200, meta);
});

export const getOrderAdmin = catchAsync(async (req: Request, res: Response) => {
  const order = await OrderService.getById(req.params.id);
  sendSuccess(res, { order }, 'Order fetched');
});

export const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const order = await OrderService.updateStatus(req.params.id, req.body.status, req.body.note);
  sendSuccess(res, { order }, 'Order status updated');
});

export const refundOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await RefundService.refundOrderPayment(req.params.id, req.body.reason);
  sendSuccess(res, { refund: result }, result.refunded ? 'Refund issued' : 'No refund needed');
});
