export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  tenantId?: string;
}

export interface Wallet {
  _id: string;
  name: string;
  accountNumber?: string;
  balance: number;
  initialBalance: number;
  openedAt: string;
  createdAt: string;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  _id: string;
  wallet: Wallet | string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  note?: string;
  createdAt: string;
  tenantId?: string;
}

export interface SessionPayload {
  token: string;
  user: User;
}

export interface Statement {
  wallet: { id: string; name: string };
  period: { start: string; end: string };
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  closingBalance: number;
  transactions: Transaction[];
}


