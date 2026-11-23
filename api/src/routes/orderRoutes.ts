import { Router } from 'express';
import {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
} from '../controllers/orderController.js';
import { authenticateJWT, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateJWT);

// Kasir, Waiter, dan Superadmin boleh melihat pesanan dan membuat pesanan
router.get('/', authorizeRoles('SUPERADMIN', 'KASIR', 'PELAYAN', 'DAPUR'), getAllOrders);
router.get('/:id', authorizeRoles('SUPERADMIN', 'KASIR', 'PELAYAN', 'DAPUR'), getOrderById);
router.post('/', authorizeRoles('SUPERADMIN', 'KASIR', 'PELAYAN'), createOrder);

// Ubah status order (misal Kasir membatalkan atau menyelesaikan order)
router.patch('/:id/status', authorizeRoles('SUPERADMIN', 'KASIR', 'DAPUR', 'PELAYAN'), updateOrderStatus);

// router.get('/', getAllOrders);
// router.get('/:id', getOrderById);
// router.post('/', createOrder);
// router.patch('/:id/status', updateOrderStatus);

export default router;