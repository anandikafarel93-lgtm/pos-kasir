import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '1d') as string;

export interface TokenPayload {
  userId: string;
  username: string;
  roleCode: string;
}

// Generate token
export const generateToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as any,
  };
  return jwt.sign(payload, JWT_SECRET, options);
};

// Verifikasi token
export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};