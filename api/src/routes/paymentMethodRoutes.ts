import { Router } from 'express';
import {
  getAllPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  patchPaymentMethod,
  deletePaymentMethod,
} from '../controllers/paymentMethodController.js';
// import { authenticateJWT, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = Router();

// router.use(authenticateJWT);

// // Kasir, Waiter, dan Superadmin boleh melihat metode pembayaran
// router.get('/', authorizeRoles('SUPERADMIN', 'KASIR', 'PELAYAN'), getAllPaymentMethods);
// router.get('/:id', authorizeRoles('SUPERADMIN', 'KASIR', 'PELAYAN'), getPaymentMethodById);

// // Hanya Superadmin yang mengelola data master metode bayar
// router.post('/', authorizeRoles('SUPERADMIN'), createPaymentMethod);
// router.put('/:id', authorizeRoles('SUPERADMIN'), updatePaymentMethod);
// router.patch('/:id', authorizeRoles('SUPERADMIN'), patchPaymentMethod);
// router.delete('/:id', authorizeRoles('SUPERADMIN'), deletePaymentMethod);

router.get('/', getAllPaymentMethods);
router.get('/:id', getPaymentMethodById);
router.post('/', createPaymentMethod);
router.put('/:id', updatePaymentMethod);
router.patch('/:id', patchPaymentMethod);
router.delete('/:id', deletePaymentMethod);


export default router;