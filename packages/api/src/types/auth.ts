import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  companyCode: string;
  role?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}