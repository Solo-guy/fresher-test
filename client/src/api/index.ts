import api from './client';
import { Statement, Transaction, Wallet } from '../types';

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  wallets: Wallet[];
  totalBalance: number;
}

export interface CreateWalletDto {
  name: string;
  accountNumber?: string;
  initialBalance: number;
  openedAt: string;
}

export interface CreateTransactionDto {
  walletId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  note?: string;
}

export interface TransactionFilters {
  walletId?: string;
  startDate?: string;
  endDate?: string;
  type?: 'income' | 'expense';
  page?: number;
  limit?: number;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type StatementExportFormat = 'pdf' | 'xlsx';

export const loginWithGoogle = async (idToken: string): Promise<LoginResponse> => {
  const { data } = await api.post<LoginResponse>('/auth/google', { idToken });
  return data;
};

export const fetchWallets = async () => {
  const { data } = await api.get<{ wallets: Wallet[]; totalBalance: number }>('/wallets');
  return data;
};

export const createWallet = async (payload: CreateWalletDto) => {
  const { data } = await api.post<Wallet>('/wallets', payload);
  return data;
};

export const createTransaction = async (payload: CreateTransactionDto) => {
  const { data } = await api.post<Transaction>('/transactions', payload);
  return data;
};

export const fetchTransactions = async (filters: TransactionFilters) => {
  const { data } = await api.get<TransactionListResponse>('/transactions', {
    params: filters,
  });
  return data;
};

export const fetchStatement = async (params: { walletId: string; startDate?: string; endDate?: string }) => {
  const { data } = await api.get<Statement>('/reports/statement', {
    params,
  });
  return data;
};

export const exportStatementFile = async (params: {
  walletId: string;
  startDate?: string;
  endDate?: string;
  format: StatementExportFormat;
}) => {
  const { data } = await api.get<Blob>('/reports/statement/export', {
    params,
    responseType: 'blob',
  });
  return data;
};


