import { Document, Model, Schema, Types, model } from 'mongoose';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  user: Types.ObjectId;
  wallet: Types.ObjectId;
  type: TransactionType;
  amount: number;
  category: string;
  date: Date;
  note?: string;
  tenantId: string;
  createdAt: Date;
}

export interface TransactionDocument extends Transaction, Document {}

const transactionSchema = new Schema<TransactionDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    wallet: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
      index: true,
    },
    type: { type: String, enum: ['income', 'expense'], required: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    date: { type: Date, required: true },
    note: String,
    tenantId: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

transactionSchema.index({ tenantId: 1, user: 1, date: -1 });
transactionSchema.index({ tenantId: 1, wallet: 1, date: -1 });
transactionSchema.index({ tenantId: 1, user: 1, type: 1, date: -1 });

export const TransactionModel: Model<TransactionDocument> = model<TransactionDocument>(
  'Transaction',
  transactionSchema,
);


