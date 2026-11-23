import { Router } from 'express';
import {
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  updateTableStatus,
  deleteTable,
  patchTable,
} from '../controllers/tableController.js';
// import { authenticateJWT, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = Router();

// router.use(authenticateJWT);

// // Kasir, Waiter, dan Superadmin boleh melihat daftar meja
// router.get('/', authorizeRoles('SUPERADMIN', 'KASIR', 'PELAYAN'), getAllTables);
// router.get('/:id', authorizeRoles('SUPERADMIN', 'KASIR', 'PELAYAN'), getTableById);

// // Kasir, Waiter, dan Superadmin boleh mengubah status meja (misal saat tamu datang/pulang)
// router.patch('/:id/status', authorizeRoles('SUPERADMIN', 'KASIR', 'PELAYAN'), updateTableStatus);

// // Hanya Superadmin yang berhak menambah, mengedit master meja, atau menghapus meja
// router.post('/', authorizeRoles('SUPERADMIN'), createTable);
// router.put('/:id', authorizeRoles('SUPERADMIN'), updateTable);
// router.delete('/:id', authorizeRoles('SUPERADMIN'), deleteTable);


router.get('/', getAllTables);
router.get('/:id', getTableById);
router.patch('/:id', patchTable);
router.post('/', createTable);
router.put('/:id', updateTable);
router.delete('/:id', deleteTable);


export default router;