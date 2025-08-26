import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authService } from '../auth.service';
import { ApiError } from '../../../middlewares/error.middleware';

// Mock bcrypt and jwt
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authService.clearAllUsers();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockInput = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'staff' as const,
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await authService.register(mockInput);

      expect(result).toMatchObject({
        id: '1',
        email: mockInput.email,
        name: mockInput.name,
        role: mockInput.role,
      });
      expect(result).not.toHaveProperty('password');
      expect(bcrypt.hash).toHaveBeenCalledWith(mockInput.password, 10);
    });

    it('should throw error if user already exists', async () => {
      const mockInput = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'staff' as const,
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      // Register first user
      await authService.register(mockInput);

      // Try to register same email
      await expect(authService.register(mockInput)).rejects.toThrow(
        new ApiError(409, 'User already exists')
      );
    });

    it('should use default role if not provided', async () => {
      const mockInput = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: undefined as unknown as 'admin' | 'staff',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await authService.register(mockInput);

      expect(result.role).toBe('staff');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Setup a test user
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'staff',
      });
    });

    it('should login successfully with correct credentials', async () => {
      const mockInput = {
        email: 'test@example.com',
        password: 'password123',
      };

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await authService.login(mockInput);

      expect(result).toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          email: mockInput.email,
          name: 'Test User',
          role: 'staff',
        },
      });
      expect(result.user).not.toHaveProperty('password');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        mockInput.password,
        'hashed-password'
      );
    });

    it('should throw error for non-existent user', async () => {
      const mockInput = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      await expect(authService.login(mockInput)).rejects.toThrow(
        new ApiError(401, 'Invalid credentials')
      );
    });

    it('should throw error for incorrect password', async () => {
      const mockInput = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(mockInput)).rejects.toThrow(
        new ApiError(401, 'Invalid credentials')
      );
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      // Setup user
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'admin',
      });

      const mockPayload = {
        id: '1',
        email: 'test@example.com',
        role: 'admin',
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await authService.refreshTokens('old-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(jwt.verify).toHaveBeenCalledWith(
        'old-refresh-token',
        expect.any(String)
      );
    });

    it('should throw error for invalid refresh token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        authService.refreshTokens('invalid-token')
      ).rejects.toThrow(new ApiError(401, 'Invalid refresh token'));
    });

    it('should throw error if user not found', async () => {
      const mockPayload = {
        id: '999',
        email: 'deleted@example.com',
        role: 'staff',
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      // Since the service catches all errors and returns 'Invalid refresh token',
      // we expect that message instead
      await expect(
        authService.refreshTokens('valid-but-user-deleted')
      ).rejects.toThrow(new ApiError(401, 'Invalid refresh token'));
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', async () => {
      const mockPayload = {
        id: '1',
        email: 'test@example.com',
        role: 'admin',
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = await authService.verifyAccessToken('valid-token');

      expect(result).toEqual(mockPayload);
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
    });

    it('should throw error for invalid access token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        authService.verifyAccessToken('invalid-token')
      ).rejects.toThrow(new ApiError(401, 'Invalid access token'));
    });
  });

  describe('utility methods', () => {
    it('should find user by email', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'staff',
      });

      const user = await authService.findUserByEmail('test@example.com');
      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
    });

    it('should return undefined for non-existent email', async () => {
      const user = await authService.findUserByEmail('notfound@example.com');
      expect(user).toBeUndefined();
    });

    it('should clear all users', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      
      // Add multiple users
      await authService.register({
        email: 'user1@example.com',
        password: 'password123',
        name: 'User 1',
        role: 'staff',
      });
      await authService.register({
        email: 'user2@example.com',
        password: 'password123',
        name: 'User 2',
        role: 'admin',
      });

      // Clear all
      await authService.clearAllUsers();

      // Verify all cleared
      const user1 = await authService.findUserByEmail('user1@example.com');
      const user2 = await authService.findUserByEmail('user2@example.com');
      
      expect(user1).toBeUndefined();
      expect(user2).toBeUndefined();
    });
  });
});