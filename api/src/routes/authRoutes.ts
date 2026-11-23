
import { Router } from 'express';
import { login, loginByPin, googleLogin } from '../controllers/authController.js';

const router = Router();

router.post('/login', login);
router.post('/login-pin', loginByPin);
router.post('/google', googleLogin);

export default router;