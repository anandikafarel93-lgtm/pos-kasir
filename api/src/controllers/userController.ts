import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await prisma.users.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        role_id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        pin_code: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        roles: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar users',
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data users',
      error: error.message,
    });
  }
};

// 2. GET: Detail user per ID
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = BigInt((id as string) || '0');

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role_id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        pin_code: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        roles: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: `User dengan ID ${id} tidak ditemukan`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil detail user',
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail user',
      error: error.message,
    });
  }
};

// 3. POST: Tambah user baru
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role_id, name, username, email, password, pin_code, phone } = req.body;

    if (!role_id || !name || !username || !password) {
      res.status(400).json({
        success: false,
        message: 'role_id, name, username, dan password wajib diisi',
      });
      return;
    }

    // 1. Cek validitas role_id
    const roleExists = await prisma.roles.findUnique({
      where: { id: BigInt(role_id) },
    });

    if (!roleExists) {
      res.status(404).json({
        success: false,
        message: `Role dengan ID ${role_id} tidak ditemukan`,
      });
      return;
    }

    // 2. Cek apakah username sudah ada
    const duplicateUser = await prisma.users.findUnique({
      where: { username },
    });

    if (duplicateUser) {
      res.status(409).json({
        success: false,
        message: `Username '${username}' sudah digunakan`,
      });
      return;
    }

    // 3. Proses Hashing Password (dan PIN jika dikirim)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    let hashedPin: string | null = null;
    if (pin_code) {
      hashedPin = await bcrypt.hash(pin_code.toString(), saltRounds);
    }

    // 4. Simpan ke Database
    const newUser = await prisma.users.create({
      data: {
        role_id: BigInt(role_id),
        name,
        username,
        email: email || null,
        password: hashedPassword,
        pin_code: hashedPin,
        phone: phone || null,
      },
      select: {
        id: true,
        role_id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        is_active: true,
        created_at: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'User berhasil dibuat dengan password terenkripsi',
      data: newUser,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat user',
      error: error.message,
    });
  }
};

// 4. PUT: Update data user
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = BigInt((id as string) || '0');
    const { role_id, name, email, password, pin_code, phone, is_active } = req.body;

    const existingUser = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: `User dengan ID ${id} tidak ditemukan`,
      });
      return;
    }

    const saltRounds = 10;

    // ✅ HANYA HASH JIKA PASSWORD DIISI
    let finalPassword = existingUser.password;
    if (password && typeof password === 'string' && password.trim() !== '') {
      finalPassword = await bcrypt.hash(password.trim(), saltRounds);
    }

    // ✅ HANYA HASH JIKA PIN DIISI
    let finalPin = existingUser.pin_code;
    if (pin_code !== undefined) {
      if (pin_code && String(pin_code).trim() !== '') {
        finalPin = await bcrypt.hash(String(pin_code).trim(), saltRounds);
      } else {
        finalPin = null; // jika admin mengosongkan PIN
      }
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        role_id: role_id ? BigInt(role_id) : existingUser.role_id,
        name: name !== undefined ? name : existingUser.name,
        email: email !== undefined ? (email || null) : existingUser.email,
        password: finalPassword,
        pin_code: finalPin,
        phone: phone !== undefined ? (phone || null) : existingUser.phone,
        is_active: is_active !== undefined ? Boolean(is_active) : existingUser.is_active,
      },
      select: {
        id: true,
        role_id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        is_active: true,
        updated_at: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Data user berhasil diperbarui',
      data: updatedUser,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui data user',
      error: error.message,
    });
  }
};

// 5. DELETE: Hapus user
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = BigInt((id as string) || '0');

    await prisma.users.delete({
      where: { id: userId },
    });

    res.status(200).json({
      success: true,
      message: `User dengan ID ${id} berhasil dihapus`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus user',
      error: error.message,
    });
  }
};