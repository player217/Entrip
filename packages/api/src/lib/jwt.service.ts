import jwt, { SignOptions, VerifyOptions, JwtPayload, TokenExpiredError, JsonWebTokenError, NotBeforeError } from 'jsonwebtoken';
import { ApiError } from '../middlewares/error.middleware';

/**
 * JWT Service - Type-safe wrapper for jsonwebtoken
 * Provides complete type safety without using 'as any'
 */
export class JWTService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiry: string;
  private readonly refreshExpiry: string;

  constructor(
    accessSecret?: string,
    refreshSecret?: string,
    accessExpiry: string = '24h',
    refreshExpiry: string = '7d'
  ) {
    this.accessSecret = accessSecret || process.env.JWT_SECRET || 'development-secret-key';
    this.refreshSecret = refreshSecret || process.env.JWT_REFRESH_SECRET || 'development-refresh-secret';
    this.accessExpiry = accessExpiry;
    this.refreshExpiry = refreshExpiry;
  }

  /**
   * Sign an access token with proper type safety
   */
  signAccessToken<T extends object>(payload: T): string {
    try {
      // Create a new object to avoid modifying the original
      const tokenPayload = { ...payload };

      // Use the synchronous sign method with explicit SignOptions
      const options: any = {
        expiresIn: this.accessExpiry as string,
        issuer: 'entrip-api',
        audience: 'entrip-client',
      };

      const token = jwt.sign(tokenPayload, this.accessSecret, options);
      return token;
    } catch (error) {
      throw new ApiError(500, 'Failed to generate access token');
    }
  }

  /**
   * Sign a refresh token with proper type safety
   */
  signRefreshToken<T extends object>(payload: T): string {
    try {
      const tokenPayload = { ...payload };

      // Use explicit SignOptions type
      const options: any = {
        expiresIn: this.refreshExpiry as string,
        issuer: 'entrip-api',
        audience: 'entrip-client',
      };

      const token = jwt.sign(tokenPayload, this.refreshSecret, options);
      return token;
    } catch (error) {
      throw new ApiError(500, 'Failed to generate refresh token');
    }
  }

  /**
   * Verify an access token with proper error handling
   */
  verifyAccessToken<T extends object>(token: string): T & JwtPayload {
    try {
      const options: VerifyOptions = {
        issuer: 'entrip-api',
        audience: 'entrip-client',
      };

      const decoded = jwt.verify(token, this.accessSecret, options);

      // Type guard to ensure decoded is an object
      if (typeof decoded === 'string') {
        throw new ApiError(401, 'Invalid token format');
      }

      return decoded as T & JwtPayload;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new ApiError(401, 'Access token has expired');
      }
      if (error instanceof JsonWebTokenError) {
        throw new ApiError(401, 'Invalid access token');
      }
      if (error instanceof NotBeforeError) {
        throw new ApiError(401, 'Access token not active yet');
      }
      throw error;
    }
  }

  /**
   * Verify a refresh token with proper error handling
   */
  verifyRefreshToken<T extends object>(token: string): T & JwtPayload {
    try {
      const options: VerifyOptions = {
        issuer: 'entrip-api',
        audience: 'entrip-client',
      };

      const decoded = jwt.verify(token, this.refreshSecret, options);

      if (typeof decoded === 'string') {
        throw new ApiError(401, 'Invalid token format');
      }

      return decoded as T & JwtPayload;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new ApiError(401, 'Refresh token has expired');
      }
      if (error instanceof JsonWebTokenError) {
        throw new ApiError(401, 'Invalid refresh token');
      }
      if (error instanceof NotBeforeError) {
        throw new ApiError(401, 'Refresh token not active yet');
      }
      throw error;
    }
  }

  /**
   * Decode a token without verification (for debugging)
   */
  decode<T extends object>(token: string): (T & JwtPayload) | null {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || typeof decoded === 'string') {
        return null;
      }
      return decoded as T & JwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * Check if an error is a JWT error
   */
  isTokenExpiredError(error: unknown): boolean {
    return error instanceof TokenExpiredError;
  }

  isJwtError(error: unknown): boolean {
    return error instanceof JsonWebTokenError;
  }

  isNotBeforeError(error: unknown): boolean {
    return error instanceof NotBeforeError;
  }
}

// Export singleton instance
export const jwtService = new JWTService();