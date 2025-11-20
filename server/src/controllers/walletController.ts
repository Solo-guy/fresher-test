import { Request, Response } from 'express';
import { z } from 'zod';
import { WalletModel } from '../models/Wallet';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

const walletSchema = z.object({
  name: z.string().min(1, 'Tên ví không được để trống'),
  accountNumber: z.string().min(3).max(30).optional(),
  initialBalance: z.number().nonnegative(),
  openedAt: z.coerce.date(),
});

export const listWallets = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const wallets = await WalletModel.find({ user: userId, tenantId: req.tenantId }).sort({
    createdAt: 1,
  });
  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  res.json({ wallets, totalBalance });
});

export const createWallet = asyncHandler(async (req: Request, res: Response) => {
  const data = walletSchema.parse(req.body);
  const existing = await WalletModel.findOne({
    user: req.user!._id,
    name: data.name,
    tenantId: req.tenantId,
  });
  if (existing) {
    throw new AppError('Tên ví đã tồn tại', 409);
  }
  const wallet = await WalletModel.create({
    user: req.user!._id,
    ...data,
    balance: data.initialBalance,
    tenantId: req.tenantId,
  });
  res.status(201).json(wallet);
});


