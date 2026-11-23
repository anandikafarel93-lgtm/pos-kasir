import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { generateToken } from '../lib/jwt.js';
import { OAuth2Client } from 'google-auth-library';

// Login standar (Username + Password)
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
      return;
    }

    const user = await prisma.users.findUnique({
      where: { username },
      include: { roles: true },
    });

    if (!user || !user.is_active) {
      res.status(401).json({ success: false, message: 'Username tidak ditemukan atau akun dinonaktifkan' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Password salah' });
      return;
    }

    // Catat waktu login terakhir
    await prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const token = generateToken({
      userId: user.id.toString(),
      username: user.username,
      roleCode: user.roles.code,
    });

    res.status(200).json({
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.roles.code,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal login', error: error.message });
  }
};

// Login cepat via PIN 6-Digit (Kasir / Dapur)
export const loginByPin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pin_code } = req.body;

    if (!pin_code) {
      res.status(400).json({ success: false, message: 'PIN wajib diisi' });
      return;
    }

    const user = await prisma.users.findFirst({
      where: {
        pin_code: pin_code.toString(),
        is_active: true,
      },
      include: { roles: true },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'PIN salah atau akun tidak aktif' });
      return;
    }

    await prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const token = generateToken({
      userId: user.id.toString(),
      username: user.username,
      roleCode: user.roles.code,
    });

    res.status(200).json({
      success: true,
      message: 'Login PIN berhasil',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.roles.code,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal login via PIN', error: error.message });
  }
};

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential } = req.body;

    if (!credential) {
      res.status(400).json({ success: false, message: 'Token Google tidak ditemukan' });
      return;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      res.status(400).json({ success: false, message: 'Email Google tidak valid' });
      return;
    }

    // 2. Cari user berdasarkan email & pastikan akun aktif
    const user = await prisma.users.findFirst({
      where: {
        email: payload.email,
        is_active: true,
      },
      include: { roles: true },
    });

    if (!user) {
      res.status(403).json({
        success: false,
        message: `Email ${payload.email} belum terdaftar sebagai staf atau akun dinonaktifkan`,
      });
      return;
    }

    // 3. Catat waktu login terakhir (sama seperti login biasa)
    await prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    // 4. Generate JWT menggunakan helper bawaan proyekmu
    const token = generateToken({
      userId: user.id.toString(),
      username: user.username,
      roleCode: user.roles.code,
    });

    // 5. Kembalikan struktur respon yang persis sama dengan login()
    res.status(200).json({
      success: true,
      message: 'Login Google berhasil',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.roles.code,
        },
      },
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: 'Autentikasi Google gagal',
      error: error.message,
    });
  }
};