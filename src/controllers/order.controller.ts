import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { 
  sendOrderNotificationEmail, 
//   sendCustomerConfirmationEmail, 
  generateWhatsAppURL,
  OrderFormData 
} from '@/utils/email.utils';
import { MulterFile } from '@/types/multer';

// Validation rules for order submission
export const validateOrderSubmission = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('countryCode')
    .notEmpty()
    .withMessage('Country code is required'),
  
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 6, max: 15 })
    .withMessage('Phone number must be between 6 and 15 digits'),
  
  body('subjectCode')
    .notEmpty()
    .withMessage('Subject/Course code is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Subject code must be between 2 and 100 characters'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  
  body('deadline')
    .notEmpty()
    .withMessage('Deadline is required'),
  
  body('pages')
    .notEmpty()
    .withMessage('Number of pages is required')
    .isNumeric()
    .withMessage('Pages must be a number')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Pages must be between 1 and 1000'),
  
  body('acceptTerms')
    .isBoolean()
    .withMessage('Terms acceptance must be a boolean')
    .custom((value) => {
      if (!value) {
        throw new Error('You must accept the terms and conditions');
      }
      return true;
    }),
  
  body('attachedFile')
    .optional()
    .isString()
    .withMessage('Attached file must be a string'),
];

// Submit order
export const submitOrder = async (req: Request, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const orderData: OrderFormData = req.body;
    const attachments = (req.files as MulterFile[]) || [];

    // Add file URLs to order data
    const fileUrls = attachments.map(file => ({
      url: file.path,
      name: file.originalname,
      size: file.size,
      type: file.mimetype
    }));

    const enrichedOrderData = {
      ...orderData,
      attachments: fileUrls,
      orderId: generateOrderId(), // Generate order ID for tracking
    };

    // Send notification email to admin with file URLs
    const emailSent = await sendOrderNotificationEmail(enrichedOrderData);
    
    // Send confirmation email to customer
    // const confirmationSent = await sendCustomerConfirmationEmail(enrichedOrderData);

    // Generate WhatsApp URL
    const whatsappURL = generateWhatsAppURL(enrichedOrderData);

    res.status(200).json({
      success: true,
      message: 'Order submitted successfully',
      data: {
        whatsappURL,
        emailSent,
        // confirmationSent,
        orderId: enrichedOrderData.orderId, // Use the same order ID
        attachments: fileUrls,
      },
    });

  } catch (error) {
    console.error('Error submitting order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};

// // Get order status (placeholder for future implementation)
// export const getOrderStatus = async (req: Request, res: Response) => {
//   try {
//     const { orderId } = req.params;

//     // In a real application, you would fetch order details from database
//     res.status(200).json({
//       success: true,
//       message: 'Order status retrieved successfully',
//       data: {
//         orderId,
//         status: 'processing',
//         estimatedCompletion: 'TBD',
//       },
//     });

//   } catch (error) {
//     console.error('Error fetching order status:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error. Please try again later.',
//     });
//   }
// };

// Helper function to generate simple order ID
const generateOrderId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 7);
  return `ODR-${timestamp}-${randomPart}`.toUpperCase();
};

// Test endpoint to check if email service is working
export const testEmailService = async (req: Request, res: Response) => {
  try {
    const testData: OrderFormData = {
      email: 'test@example.com',
      countryCode: '+44',
      phoneNumber: '1234567890',
      subjectCode: 'TEST-001',
      description: 'This is a test order submission to verify email functionality.',
      deadline: '7 days',
      pages: '5',
      acceptTerms: true,
      attachments: [
        {
          url: 'https://res.cloudinary.com/example/test-document.pdf',
          name: 'test-document.pdf',
          size: 1024,
          type: 'application/pdf'
        }
      ]
    };

    const emailSent = await sendOrderNotificationEmail(testData);
    
    res.status(200).json({
      success: true,
      message: 'Email service test completed',
      data: {
        emailSent,
        testData,
      },
    });

  } catch (error) {
    console.error('Error testing email service:', error);
    res.status(500).json({
      success: false,
      message: 'Email service test failed',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};