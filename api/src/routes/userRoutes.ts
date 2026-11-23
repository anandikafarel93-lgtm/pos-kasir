import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import { authenticateJWT, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateJWT);
// router.use(authorizeRoles('SUPERADMIN'));

// Endpoint: /api/users
router.get('/',authorizeRoles('SUPERADMIN','KASIR') ,getAllUsers);
router.get('/:id', getUserById);
router.post('/',authorizeRoles('SUPERADMIN'), createUser);
router.put('/:id', authorizeRoles('SUPERADMIN'), updateUser);
router.delete('/:id',authorizeRoles('SUPERADMIN'), deleteUser);

export default router;