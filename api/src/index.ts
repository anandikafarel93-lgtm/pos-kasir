(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

(BigInt.prototype as any).toJSON = function () {
  const int = Number.parseInt(this.toString(), 10);
  return Number.isSafeInteger(int) ? int : this.toString();
};

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import roleRouter from './routes/roleRoutes.js';
import userRouter from './routes/userRoutes.js';
import authRouter from './routes/authRoutes.js';
import categoryRouter from './routes/categoryRoutes.js';
import productRouter from './routes/productRoutes.js';
import tableRouter from './routes/tableRoutes.js';
import paymentMethodRouter from './routes/paymentMethodRoutes.js';
import orderRouter from './routes/orderRoutes.js'
import paymentRouter from './routes/paymentRoutes.js'
import customerRouter from './routes/customerRoutes.js'

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Base Route Tes
app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'API Service running' });
});

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api/auth', authRouter);
app.use('/api/roles', roleRouter);
app.use('/api/users', userRouter);
app.use('/api/categories', categoryRouter )
app.use('/api/products', productRouter )
app.use('/api/tables', tableRouter )
app.use('/api/payment-methods', paymentMethodRouter )
app.use('/api/orders', orderRouter )
app.use('/api/payments', paymentRouter )
app.use('/api/customers', customerRouter)



app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});

