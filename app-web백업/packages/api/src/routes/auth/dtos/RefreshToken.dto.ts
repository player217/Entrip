import { z } from 'zod';

export const RefreshTokenDto = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenDto>;