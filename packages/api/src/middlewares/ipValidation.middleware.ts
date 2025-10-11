import { Request, Response, NextFunction } from 'express';

const parseList = (val?: string) => (val ? val.split(',').map((s) => s.trim()).filter(Boolean) : []);

const DEV_DEFAULTS = ['127.0.0.1', '::1', 'localhost'];

export const ipValidation = (req: Request, res: Response, next: NextFunction) => {
  const envList = parseList(process.env.IP_WHITELIST);
  const whitelist = envList.length > 0 ? envList : DEV_DEFAULTS;

  // Express may return IPv6-mapped IPv4 as ::ffff:127.0.0.1
  const ip = (req.ip || '').replace('::ffff:', '');

  if (whitelist.some((allowed) => ip === allowed)) {
    return next();
  }

  // In non-production, allow all if no whitelist configured
  if (process.env.NODE_ENV !== 'production' && envList.length === 0) {
    return next();
  }

  return res.status(403).json({
    error: 'FORBIDDEN',
    message: 'IP not allowed',
    ip,
  });
};

