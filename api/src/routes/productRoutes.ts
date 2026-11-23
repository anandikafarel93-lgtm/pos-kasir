import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
// import { authenticateJWT, authorizeRoles } from '../middlewares/authMiddleware.js';
import { uploadProductImage } from '../middlewares/uploadMiddleware.js';

const router = Router();

// // Wajib menyertakan Bearer Token JWT
// router.use(authenticateJWT);

// // Kasir, Waiter, Koki Dapur, dan Superadmin boleh melihat katalog produk
// router.get('/', authorizeRoles('SUPERADMIN', 'KASIR', 'PELAYAN', 'DAPUR'), getAllProducts);
// router.get('/:id', authorizeRoles('SUPERADMIN', 'KASIR', 'PELAYAN', 'DAPUR'), getProductById);

// // Hanya Superadmin yang berhak mengelola data master produk (tambah, edit, hapus)
// router.post('/', authorizeRoles('SUPERADMIN'), createProduct);
// router.put('/:id', authorizeRoles('SUPERADMIN'), updateProduct);
// router.delete('/:id', authorizeRoles('SUPERADMIN'), deleteProduct);


// Kasir, Waiter, Koki Dapur, dan Superadmin boleh melihat katalog produk
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Hanya Superadmin yang berhak mengelola data master produk (tambah, edit, hapus)
router.post('/', uploadProductImage.single('image_url'), createProduct);
router.put('/:id', uploadProductImage.single('image_url'), updateProduct);
router.delete('/:id', deleteProduct);

export default router;