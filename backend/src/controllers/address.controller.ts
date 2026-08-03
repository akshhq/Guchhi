import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess } from '../utils/ApiResponse';
import { AddressService } from '../services/address.service';

export const listAddresses = catchAsync(async (req: Request, res: Response) => {
  const addresses = await AddressService.list(req.user!.id);
  sendSuccess(res, { addresses }, 'Addresses fetched');
});

export const createAddress = catchAsync(async (req: Request, res: Response) => {
  const address = await AddressService.create(req.user!.id, req.body);
  sendSuccess(res, { address }, 'Address created', 201);
});

export const updateAddress = catchAsync(async (req: Request, res: Response) => {
  const address = await AddressService.update(req.user!.id, req.params.id, req.body);
  sendSuccess(res, { address }, 'Address updated');
});

export const deleteAddress = catchAsync(async (req: Request, res: Response) => {
  await AddressService.remove(req.user!.id, req.params.id);
  sendSuccess(res, {}, 'Address deleted');
});
