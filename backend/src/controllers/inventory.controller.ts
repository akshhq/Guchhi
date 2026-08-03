import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess } from '../utils/ApiResponse';
import { InventoryService } from '../services/inventory.service';

export const lowStock = catchAsync(async (req: Request, res: Response) => {
  const products = await InventoryService.lowStockProducts();
  sendSuccess(res, { products }, 'Low stock products fetched');
});

export const logs = catchAsync(async (req: Request, res: Response) => {
  const { items, meta } = await InventoryService.logs(req.query as any);
  sendSuccess(res, { logs: items }, 'Inventory logs fetched', 200, meta);
});

export const adjustStock = catchAsync(async (req: Request, res: Response) => {
  const product = await InventoryService.adjustStock(req.params.productId, req.body.quantity, req.body.reason);
  sendSuccess(res, { product }, 'Stock adjusted');
});
