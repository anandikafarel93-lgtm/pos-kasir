import { Router } from 'express';
import {
  processPayment,
  getPaymentReceiptByOrderId,
  getAllPayments,
  updatePayment, 
  deletePayment, 
  createMidtransToken,
  midtransWebhook,
} from '../controllers/paymentController.js';
import { authenticateJWT, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = Router();
router.post('/midtrans/token', createMidtransToken as any);
router.post('/midtrans/webhook', midtransWebhook as any);

router.post('/',  processPayment);
router.get('/order/:orderId', getPaymentReceiptByOrderId);
router.get('/',  getAllPayments);
router.put('/:id',  updatePayment);
router.delete('/:id',  deletePayment);

export default router;