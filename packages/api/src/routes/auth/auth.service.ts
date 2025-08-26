import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RegisterInput } from './dtos/Register.dto';
import { LoginInput } from './dtos/Login.dto';
import { ApiError } from '../../middlewares/error.middleware';

// Types
interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'staff';
  createdAt: Date;
}

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// In-memory user store (replace with Prisma later)
const users: User[] = [];
let idCounter = 1;

// Token configuration
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'development-refresh-secret';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export class AuthService {
  async register(input: RegisterInput): Promise<Omit<User, 'password'>> {
    // Check if user already exists
    const existingUser = users.find(u => u.email === input.email);
    if (existingUser) {
      throw new ApiError(409, 'User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 10);

    // Create new user
    const newUser: User = {
      id: String(idCounter++),
      email: input.email,
      password: hashedPassword,
      name: input.name,
      role: input.role || 'staff',
      createdAt: new Date(),
    };

    users.push(newUser);

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async login(input: LoginInput): Promise<AuthTokens & { user: Omit<User, 'password'> }> {
    // Find user
    const user = users.find(u => u.email === input.email);
    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Return tokens and user info
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return {
      ...tokens,
      user: userWithoutPassword,
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as TokenPayload;

      // Find user
      const user = users.find(u => u.id === payload.id);
      if (!user) {
        throw new ApiError(401, 'User not found');
      }

      // Generate new tokens
      return this.generateTokens(user);
    } catch (error) {
      throw new ApiError(401, 'Invalid refresh token');
    }
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new ApiError(401, 'Invalid access token');
    }
  }

  private generateTokens(user: User): AuthTokens {
    const payload: TokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    return { accessToken, refreshToken };
  }

  // Utility methods for testing
  async clearAllUsers() {
    users.length = 0;
    idCounter = 1;
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    return users.find(u => u.email === email);
  }
}

export const authService = new AuthService();