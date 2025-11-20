import { Request, Response } from 'express';
import { loginOrRegisterWithGoogle } from '../services/authService';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { signToken } from '../utils/token';
import { WalletModel } from '../models/Wallet';

export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = req.body as { idToken?: string };
  if (!idToken) {
    throw new AppError('Thiếu idToken', 400);
  }
  const tenantId = req.tenantId;
  const user = await loginOrRegisterWithGoogle(idToken, tenantId);
  const token = signToken({ userId: user.id, email: user.email, name: user.name, tenantId });
  const wallets = await WalletModel.find({ user: user._id, tenantId }).sort({ createdAt: 1 });
  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      tenantId,
    },
    wallets,
    totalBalance,
  });
});


