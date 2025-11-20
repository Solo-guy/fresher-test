import { Document, Model, Schema, Types, model } from 'mongoose';

export interface Wallet {
  user: Types.ObjectId;
  name: string;
  accountNumber?: string;
  initialBalance: number;
  balance: number;
  openedAt: Date;
  tenantId: string;
  createdAt: Date;
}

export interface WalletDocument extends Wallet, Document {}

const walletSchema = new Schema<WalletDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    accountNumber: String,
    initialBalance: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    openedAt: { type: Date, required: true },
    tenantId: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

walletSchema.index({ tenantId: 1, user: 1, name: 1 }, { unique: true });
walletSchema.index({ tenantId: 1, user: 1, createdAt: 1 });

export const WalletModel: Model<WalletDocument> =
  model<WalletDocument>('Wallet', walletSchema);


