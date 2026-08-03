import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  generateRandomToken,
  refreshTokenExpiryDate,
} from '../utils/jwt';
import { sendMail } from '../emails/mailer';
import {
  welcomeEmail,
  verifyEmailTemplate,
  resetPasswordEmail,
} from '../emails/templates';
import { Role } from '@prisma/client';

interface SignupInput {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  password: string;
}

function publicUser(user: any) {
  const { passwordHash, resetToken, resetTokenExpiry, emailVerifyToken, emailVerifyExpiry, ...rest } = user;
  return rest;
}

async function issueTokenPair(userId: string, role: Role, email: string, ip?: string) {
  const accessToken = signAccessToken({ sub: userId, role, email });
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshTokenExpiryDate(),
      createdByIp: ip,
    },
  });

  return { accessToken, refreshToken };
}

export const AuthService = {
  async signup(input: SignupInput, ip?: string) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw ApiError.conflict('An account with this email already exists');

    if (input.phone) {
      const phoneTaken = await prisma.user.findUnique({ where: { phone: input.phone } });
      if (phoneTaken) throw ApiError.conflict('An account with this phone number already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
    const emailVerifyToken = generateRandomToken();

    const user = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        passwordHash,
        // Only the hash is persisted — same reasoning as refresh tokens: if
        // the database were ever exposed, a stored plaintext token would be
        // directly usable to take over the account, whereas a hash isn't.
        emailVerifyToken: hashToken(emailVerifyToken),
        emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    sendMail(user.email, 'Welcome to Guchhi', welcomeEmail(user.firstName));
    sendMail(
      user.email,
      'Verify your email',
      verifyEmailTemplate(user.firstName, `${env.CLIENT_URL}/verify-email?token=${emailVerifyToken}`)
    );

    const tokens = await issueTokenPair(user.id, user.role, user.email, ip);
    return { user: publicUser(user), ...tokens };
  },

  async login(email: string, password: string, ip?: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw ApiError.unauthorized('Invalid email or password');
    if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw ApiError.unauthorized('Invalid email or password');

    const tokens = await issueTokenPair(user.id, user.role, user.email, ip);
    return { user: publicUser(user), ...tokens };
  },

  async logout(refreshToken: string) {
    if (!refreshToken) return;
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken) },
      data: { revoked: true },
    });
  },

  async refresh(refreshToken: string, ip?: string) {
    if (!refreshToken) throw ApiError.unauthorized('Refresh token missing');

    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.isActive) throw ApiError.unauthorized('Invalid session');

    // Rotate: revoke old token, issue a new pair
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    const tokens = await issueTokenPair(user.id, user.role, user.email, ip);

    return { user: publicUser(user), ...tokens };
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond success (don't leak which emails exist)
    if (!user) return;

    const resetToken = generateRandomToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashToken(resetToken),
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    sendMail(
      user.email,
      'Reset your password',
      resetPasswordEmail(user.firstName, `${env.CLIENT_URL}/reset-password?token=${resetToken}`)
    );
  },

  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: { resetToken: hashToken(token), resetTokenExpiry: { gt: new Date() } },
    });
    if (!user) throw ApiError.badRequest('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });

    // Revoke all existing sessions for safety
    await prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { revoked: true } });
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw ApiError.badRequest('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  },

  async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: { emailVerifyToken: hashToken(token), emailVerifyExpiry: { gt: new Date() } },
    });
    if (!user) throw ApiError.badRequest('Invalid or expired verification token');

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerifyToken: null, emailVerifyExpiry: null },
    });
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');
    return publicUser(user);
  },

  publicUser,
};
