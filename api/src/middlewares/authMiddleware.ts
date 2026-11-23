import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../lib/jwt.js';

// Perluas tipe Request bawaan Express agar mengenali properti req.user
export interface AuthRequest extends Request {
  user?: TokenPayload;
}

// 1. Cek validitas JWT token
export const authenticateJWT = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Akses ditolak. Token tidak ditemukan atau format tidak valid (Bearer token)',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // tempel payload user ke request
    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: 'Token tidak valid atau sudah kadaluarsa',
      error: error.message,
    });
  }
};

// 2. Batasi akses berdasarkan Role (Otorisasi)
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Tidak terautentikasi' });
      return;
    }

    if (!allowedRoles.includes(req.user.roleCode)) {
      res.status(403).json({
        success: false,
        message: `Akses ditolak. Hak akses Anda (${req.user.roleCode}) tidak diizinkan mengakses halaman ini.`,
      });
      return;
    }

    next();
  };
};