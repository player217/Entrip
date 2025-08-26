export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER', 
  USER = 'USER'
}

export interface User {
  id: string;
  companyCode: string;
  username: string;
  email?: string;
  name: string;
  role: UserRole;
  department?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Company {
  code: string;
  name: string;
  logo?: string;
  isActive: boolean;
  settings?: {
    maxUsers?: number;
    features?: string[];
  };
}

export interface UserWithCompany extends User {
  company: Company;
}