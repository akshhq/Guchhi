import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess } from '../utils/ApiResponse';
import { AuthService } from '../services/auth.service';
import { env, isProd } from '../config/env';
import { CartService } from '../services/cart.service';

const REFRESH_COOKIE = 'refreshToken';

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

export const signup = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.signup(req.body, req.ip);
  setRefreshCookie(res, result.refreshToken);

  // Merge any guest cart (identified by x-guest-id header) into the new user's cart
  const guestId = req.header('x-guest-id');
  if (guestId) await CartService.mergeGuestCart(guestId, result.user.id);

  sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 'Account created successfully', 201);
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password, req.ip);
  setRefreshCookie(res, result.refreshToken);

  const guestId = req.header('x-guest-id');
  if (guestId) await CartService.mergeGuestCart(guestId, result.user.id);

  sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 'Logged in successfully');
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  await AuthService.logout(token);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  sendSuccess(res, {}, 'Logged out successfully');
});

export const refresh = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE] || req.body.refreshToken;
  const result = await AuthService.refresh(token, req.ip);
  setRefreshCookie(res, result.refreshToken);
  sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 'Token refreshed');
});

export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  await AuthService.forgotPassword(req.body.email);
  sendSuccess(res, {}, 'If an account exists with this email, a reset link has been sent');
});

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  await AuthService.resetPassword(req.body.token, req.body.password);
  sendSuccess(res, {}, 'Password reset successfully. Please log in again');
});

export const changePassword = catchAsync(async (req: Request, res: Response) => {
  await AuthService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  sendSuccess(res, {}, 'Password changed successfully');
});

export const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  await AuthService.verifyEmail(req.body.token);
  sendSuccess(res, {}, 'Email verified successfully');
});

export const me = catchAsync(async (req: Request, res: Response) => {
  const user = await AuthService.me(req.user!.id);
  sendSuccess(res, { user }, 'Current user fetched');
});
