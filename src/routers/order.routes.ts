import { Router } from 'express';
import { 
  submitOrder, 
//   getOrderStatus, 
  testEmailService,
  validateOrderSubmission 
} from '@/controllers/order.controller';
import { upload } from '@/utils/cloudinary.utils';

const orderRouter = Router();

// POST /api/order/submit - Submit a new order
orderRouter.post('/submit', 
  upload.client.array('attachments', 5), // Allow up to 5 file attachments
  validateOrderSubmission, 
  submitOrder
);

// GET /api/order/status/:orderId - Get order status
// orderRouter.get('/status/:orderId', getOrderStatus);

// POST /api/order/test-email - Test email service (development only)
if (process.env.NODE_ENV === 'development') {
  orderRouter.post('/test-email', testEmailService);
}

export default orderRouter;