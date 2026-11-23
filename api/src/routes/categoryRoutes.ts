import { Router } from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
// import { authenticateJWT, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = Router();

// // Wajib menyertakan Bearer Token JWT
// router.use(authenticateJWT);

// // Kasir, Pelayan, Dapur, dan Superadmin boleh mengambil data kategori
// router.get('/', authorizeRoles('SUPERADMIN', 'KASIR', 'PELAYAN', 'DAPUR'), getAllCategories);
// router.get('/:id', authorizeRoles('SUPERADMIN', 'KASIR', 'PELAYAN', 'DAPUR'), getCategoryById);

// // Hanya Superadmin yang boleh mengelola Master Kategori
// router.post('/', authorizeRoles('SUPERADMIN'), createCategory);
// router.put('/:id', authorizeRoles('SUPERADMIN'), updateCategory);
// router.delete('/:id', authorizeRoles('SUPERADMIN'), deleteCategory);

// Wajib menyertakan Bearer Token JWT
// router.use(authenticateJWT);

router.get('/', getAllCategories);
router.get('/:id', getCategoryById);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);


export default router;