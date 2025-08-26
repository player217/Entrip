import { User, UserRole } from './user';

export interface LoginRequest {
  companyCode: string;
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

export interface JWTPayload {
  userId: string;
  companyCode: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  checkAuth: () => Promise<boolean>;
}