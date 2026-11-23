import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Pastikan folder uploads/products tersedia
const uploadDir = 'uploads/products';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi penyimpanan file di server
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Format nama: menu-timestamp-random.ext (contoh: menu-1730350000000-847291.jpg)
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `menu-${uniqueSuffix}${ext}`);
  },
});

// Filter tipe file gambar
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung! Hanya gambar (JPG, JPEG, PNG, WEBP) yang diizinkan.'));
  }
};

export const uploadProductImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // Maksimal 2 MB
  },
});