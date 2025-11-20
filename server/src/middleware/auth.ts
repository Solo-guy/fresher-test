import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserModel } from '../models/User';
import { AppError } from '../utils/AppError';
import { SignedTokenPayload } from '../utils/token';

export const authGuard = async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('Unauthorized', 401);
  }
  const token = header.split(' ')[1];
  const payload = jwt.verify(token, env.jwtSecret) as SignedTokenPayload;
  if (payload.tenantId !== req.tenantId) {
    throw new AppError('Tenant mismatch', 403);
  }
  const user = await UserModel.findOne({ _id: payload.userId, tenantId: payload.tenantId });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  req.user = user;
  next();
};


