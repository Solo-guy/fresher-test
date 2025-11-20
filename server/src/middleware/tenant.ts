import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

const TENANT_HEADER = 'x-tenant-id';
const TENANT_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export const tenantResolver = (req: Request, _res: Response, next: NextFunction) => {
  const headerValue = req.header(TENANT_HEADER);
  const tenantId =
    headerValue && TENANT_PATTERN.test(headerValue) ? headerValue : env.defaultTenantId;
  req.tenantId = tenantId;
  next();
};


