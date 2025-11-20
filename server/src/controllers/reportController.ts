import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { WalletModel, WalletDocument } from '../models/Wallet';
import { TransactionModel } from '../models/Transaction';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

const statementSchema = z.object({
  walletId: z.string().min(1),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const statementExportSchema = statementSchema.extend({
  format: z.enum(['pdf', 'xlsx']).default('pdf'),
});

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});
const dateFormatter = new Intl.DateTimeFormat('vi-VN');

const resolveRange = (startDate?: Date, endDate?: Date) => {
  const now = new Date();
  const start =
    startDate ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate ?? now;
  return { start, end };
};

const computeStatementSummary = async ({
  wallet,
  userId,
  tenantId,
  start,
  end,
}: {
  wallet: WalletDocument;
  userId: Types.ObjectId;
  tenantId: string;
  start: Date;
  end: Date;
}) => {
  const baseMatch = {
    wallet: wallet._id,
    user: userId,
    tenantId,
  };

  const openingAggregate = await TransactionModel.aggregate([
    {
      $match: {
        ...baseMatch,
        date: { $lt: start },
      },
    },
    {
      $group: {
        _id: null,
        balance: {
          $sum: {
            $cond: [{ $eq: ['$type', 'income'] }, '$amount', { $multiply: ['$amount', -1] }],
          },
        },
      },
    },
  ]);

  const rangeAggregate = await TransactionModel.aggregate([
    {
      $match: {
        ...baseMatch,
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: {
            $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0],
          },
        },
        totalExpense: {
          $sum: {
            $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0],
          },
        },
      },
    },
  ]);

  const openingBalance = wallet.initialBalance + (openingAggregate[0]?.balance ?? 0);
  const totalIncome = rangeAggregate[0]?.totalIncome ?? 0;
  const totalExpense = rangeAggregate[0]?.totalExpense ?? 0;
  const closingBalance = openingBalance + totalIncome - totalExpense;

  return { openingBalance, totalIncome, totalExpense, closingBalance };
};

export const getStatement = asyncHandler(async (req: Request, res: Response) => {
  const data = statementSchema.parse({
    walletId: req.query.walletId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });
  const wallet = await WalletModel.findOne({
    _id: data.walletId,
    user: req.user!._id,
    tenantId: req.tenantId,
  });
  if (!wallet) {
    throw new AppError('Không tìm thấy ví', 404);
  }

  const { start, end } = resolveRange(data.startDate, data.endDate);
  if (start > end) {
    throw new AppError('startDate phải nhỏ hơn hoặc bằng endDate', 400);
  }
  const summary = await computeStatementSummary({
    wallet,
    userId: req.user!._id,
    tenantId: req.tenantId,
    start,
    end,
  });

  const transactions = await TransactionModel.find({
    wallet: wallet._id,
    user: req.user!._id,
    tenantId: req.tenantId,
    date: { $gte: start, $lte: end },
  }).sort({ date: -1 });

  res.json({
    wallet: { id: wallet.id, name: wallet.name },
    period: { start, end },
    ...summary,
    transactions,
  });
});

export const exportStatement = asyncHandler(async (req: Request, res: Response) => {
  const data = statementExportSchema.parse({
    walletId: req.query.walletId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    format: req.query.format,
  });
  const wallet = await WalletModel.findOne({
    _id: data.walletId,
    user: req.user!._id,
    tenantId: req.tenantId,
  });
  if (!wallet) {
    throw new AppError('Không tìm thấy ví', 404);
  }
  const { start, end } = resolveRange(data.startDate, data.endDate);
  if (start > end) {
    throw new AppError('startDate phải nhỏ hơn hoặc bằng endDate', 400);
  }
  const summary = await computeStatementSummary({
    wallet,
    userId: req.user!._id,
    tenantId: req.tenantId,
    start,
    end,
  });
  const cursor = TransactionModel.find({
    wallet: wallet._id,
    user: req.user!._id,
    tenantId: req.tenantId,
    date: { $gte: start, $lte: end },
  })
    .sort({ date: 1 })
    .lean()
    .cursor();
  const safeWalletName = wallet.name.replace(/[^\w\d-]+/g, '_').toLowerCase();
  const startLabel = start.toISOString().split('T')[0];
  const endLabel = end.toISOString().split('T')[0];
  const filename = `statement_${safeWalletName}_${startLabel}_${endLabel}`;

  if (data.format === 'xlsx') {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
    const sheet = workbook.addWorksheet('Statement');

    sheet.addRow(['Ví', wallet.name]).commit();
    sheet.addRow(['Khoảng thời gian', `${startLabel} - ${endLabel}`]).commit();
    sheet.addRow(['Số dư đầu kỳ', summary.openingBalance]).commit();
    sheet.addRow(['Tổng thu', summary.totalIncome]).commit();
    sheet.addRow(['Tổng chi', summary.totalExpense]).commit();
    sheet.addRow(['Số dư cuối kỳ', summary.closingBalance]).commit();
    sheet.addRow([]).commit();
    sheet.addRow(['Ngày', 'Danh mục', 'Loại', 'Số tiền', 'Ghi chú']).commit();

    for await (const txn of cursor) {
      sheet
        .addRow([
          dateFormatter.format(new Date(txn.date)),
          txn.category,
          txn.type === 'income' ? 'Thu' : 'Chi',
          txn.type === 'income' ? txn.amount : -txn.amount,
          txn.note ?? '',
        ])
        .commit();
    }
    await cursor.close();
    await sheet.commit();
    await workbook.commit();
    return;
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);
  doc.fontSize(18).text(`Sao kê ví: ${wallet.name}`);
  doc.fontSize(12).text(`Khoảng thời gian: ${dateFormatter.format(start)} - ${dateFormatter.format(end)}`);
  doc.moveDown();
  doc.text(`Số dư đầu kỳ: ${currencyFormatter.format(summary.openingBalance)}`);
  doc.text(`Tổng thu: ${currencyFormatter.format(summary.totalIncome)}`);
  doc.text(`Tổng chi: ${currencyFormatter.format(summary.totalExpense)}`);
  doc.text(`Số dư cuối kỳ: ${currencyFormatter.format(summary.closingBalance)}`);
  doc.moveDown();
  doc.fontSize(14).text('Chi tiết giao dịch');
  doc.moveDown(0.5);
  doc.fontSize(11);
  for await (const txn of cursor) {
    doc.text(
      `${dateFormatter.format(new Date(txn.date))} | ${txn.category} | ${
        txn.type === 'income' ? '+' : '-'
      }${currencyFormatter.format(txn.amount)} | ${txn.note ?? ''}`,
    );
  }
  await cursor.close();
  doc.end();
});


