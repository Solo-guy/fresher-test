import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { z } from 'zod';
import { WalletModel } from '../models/Wallet';
import { TransactionModel, TransactionDocument } from '../models/Transaction';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

const transactionSchema = z.object({
  walletId: z.string().min(1),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  category: z.string().min(1),
  date: z.coerce.date(),
  note: z.string().max(250).optional(),
});

const listTransactionsSchema = z.object({
  walletId: z.string().min(1).optional(),
  type: z.enum(['income', 'expense']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(10).max(500).default(50),
});

export const createTransaction = asyncHandler(async (req: Request, res: Response) => {
  const payload = transactionSchema.parse(req.body);
  const wallet = await WalletModel.findOne({
    _id: payload.walletId,
    user: req.user!._id,
    tenantId: req.tenantId,
  });
  if (!wallet) {
    throw new AppError('Không tìm thấy ví', 404);
  }
  if (payload.type === 'expense' && wallet.balance < payload.amount) {
    throw new AppError('Số dư không đủ để chi', 400);
  }

  const session = await mongoose.startSession();
  let savedTransaction: TransactionDocument | null = null;
  await session.withTransaction(async () => {
    const balanceChange = payload.type === 'income' ? payload.amount : -payload.amount;
    wallet.balance += balanceChange;
    await wallet.save({ session });
    const created = await TransactionModel.create(
      [
        {
          user: req.user!._id,
          wallet: wallet._id,
          ...payload,
          tenantId: req.tenantId,
        },
      ],
      { session },
    );
    savedTransaction = created[0];
  });
  await session.endSession();
  res.status(201).json(savedTransaction);
});

export const listTransactions = asyncHandler(async (req: Request, res: Response) => {
  const parsed = listTransactionsSchema.parse({
    walletId: req.query.walletId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    type: req.query.type,
    page: req.query.page,
    limit: req.query.limit,
  });
  const { walletId, startDate, endDate, type, page, limit } = parsed;
  const filters: Record<string, unknown> = {
    user: req.user!._id,
    tenantId: req.tenantId,
  };
  if (walletId) {
    filters.wallet = walletId;
  }
  if (type) {
    filters.type = type;
  }
  if (startDate || endDate) {
    filters.date = {};
    if (startDate) {
      (filters.date as Record<string, Date>).$gte = startDate;
    }
    if (endDate) {
      (filters.date as Record<string, Date>).$lte = endDate;
    }
  }
  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    TransactionModel.find(filters)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('wallet', 'name')
      .lean(),
    TransactionModel.countDocuments(filters),
  ]);
  res.json({
    transactions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});


