import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { role_code_enum } from '@prisma/client';

// 1. GET: Ambil semua data roles beserta hitungan users
export const getAllRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await prisma.roles.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar roles',
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data roles',
      error: error.message,
    });
  }
};

// 2. GET: Ambil detail role berdasarkan ID
export const getRoleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const roleId = BigInt((id as string) || '0');

    const role = await prisma.roles.findUnique({
      where: { id: roleId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            is_active: true,
          },
        },
      },
    });

    if (!role) {
      res.status(404).json({
        success: false,
        message: `Role dengan ID ${id} tidak ditemukan`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil detail role',
      data: role,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail role',
      error: error.message,
    });
  }
};

// 3. POST: Tambah role baru
export const createRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code, description } = req.body;

    if (!name || !code) {
      res.status(400).json({
        success: false,
        message: 'Field name dan code wajib diisi',
      });
      return;
    }

    // Validasi Enum role_code_enum
    if (!Object.values(role_code_enum).includes(code)) {
      res.status(400).json({
        success: false,
        message: `Kode role tidak valid. Pilihan valid: ${Object.values(role_code_enum).join(', ')}`,
      });
      return;
    }

    // Cek duplikasi code unik
    const existing = await prisma.roles.findUnique({
      where: { code },
    });

    if (existing) {
      res.status(409).json({
        success: false,
        message: `Role dengan kode ${code} sudah terdaftar`,
      });
      return;
    }

    const newRole = await prisma.roles.create({
      data: {
        name,
        code,
        description: description || null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Role berhasil ditambahkan',
      data: newRole,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan role',
      error: error.message,
    });
  }
};

// 4. PUT: Update role
export const updateRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const roleId = BigInt((id as string) || '0');
    const { name, code, description } = req.body;

    const existingRole = await prisma.roles.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      res.status(404).json({
        success: false,
        message: `Role dengan ID ${id} tidak ditemukan`,
      });
      return;
    }

    if (code && code !== existingRole.code) {
      if (!Object.values(role_code_enum).includes(code)) {
        res.status(400).json({
          success: false,
          message: `Kode role tidak valid. Pilihan valid: ${Object.values(role_code_enum).join(', ')}`,
        });
        return;
      }

      const duplicate = await prisma.roles.findUnique({
        where: { code },
      });

      if (duplicate) {
        res.status(409).json({
          success: false,
          message: `Kode role ${code} sudah digunakan`,
        });
        return;
      }
    }

    const updatedRole = await prisma.roles.update({
      where: { id: roleId },
      data: {
        name: name ?? existingRole.name,
        code: code ?? existingRole.code,
        description: description ?? existingRole.description,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Data role berhasil diperbarui',
      data: updatedRole,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui role',
      error: error.message,
    });
  }
};

// 5. DELETE: Hapus role
export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const roleId = BigInt((id as string) || '0');

    // Cek apakah ada users yang menggunakan role ini
    const countUsers = await prisma.users.count({
      where: { role_id: roleId },
    });

    if (countUsers > 0) {
      res.status(400).json({
        success: false,
        message: `Role tidak bisa dihapus karena masih digunakan oleh ${countUsers} user.`,
      });
      return;
    }

    await prisma.roles.delete({
      where: { id: roleId },
    });

    res.status(200).json({
      success: true,
      message: `Role dengan ID ${id} berhasil dihapus`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus role',
      error: error.message,
    });
  }
};