import { body } from "express-validator";

// Validation middleware for samples
export const validateSample = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 5000 })
    .withMessage("Title must be between 3 and 5000 characters"),
  
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 10, max: 10000 })
    .withMessage("Description must be between 10 and 10000 characters"),
  
  body("content")
    .optional()
    .isLength({ min: 10 })
    .withMessage("Content must be at least 10 characters"),
  
  body("subject")
    .notEmpty()
    .withMessage("Subject is required"),

  body("wordCount")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Word count must be a non-negative integer"),

  body("referenceCount")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Reference count must be a non-negative integer"),
];

// Validation middleware for FAQs
export const validateFAQ = [
  body("question")
    .trim()
    .notEmpty()
    .withMessage("Question is required")
    .isLength({ min: 3, max: 500 })
    .withMessage("Question must be between 3 and 500 characters"),
  
  body("answer")
    .trim()
    .notEmpty()
    .withMessage("Answer is required")
    .isLength({ min: 10, max: 2000 })
    .withMessage("Answer must be between 10 and 2000 characters"),
  
  body("order")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Order must be a non-negative integer"),
];
