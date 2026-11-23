import { Router } from 'express';
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customerController.js';
// import { authenticateJWT, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = Router();

// Wajib login untuk mengakses semua endpoint pelanggan
// router.use(authenticateJWT);

router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
// router.delete('/:id', authorizeRoles('SUPERADMIN'), deleteCustomer);

export default router;