import { body } from "express-validator";
import { BlogCategories } from "@/types/blogCategories";

// Validation middleware
export const validateBlog = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 200 })
    .withMessage("Title must be between 3 and 200 characters"),
  
  body("subtitle")
    .optional()
    .trim()
    .isLength({ min: 0, max: 300 })
    .withMessage("Subtitle must be less than 300 characters"),
  
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 5, max: 750 })
    .withMessage("Description must be between 5 and 750 characters"),

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ min: 10 })
    .withMessage("Content must be at least 10 characters")
    .optional(),
  
  body("category")
    .optional()
    .isIn(BlogCategories)
    .withMessage(`Category must be one of: ${BlogCategories.join(", ")}`),
  
  body("tags")
    .optional()
    .customSanitizer((value) => {
      // If tags is a string (JSON), parse it
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch (e) {
          // If parsing fails, return empty array
          return [];
        }
      }
      // If it's already an array or something else, return as is
      return Array.isArray(value) ? value : [];
    })
    .custom((value) => {
      // Validate the array
      if (!Array.isArray(value)) {
        throw new Error("Tags must be an array");
      }
      
      if (value.some(tag => typeof tag !== 'string' || tag.length < 2 || tag.length > 50)) {
        throw new Error("Each tag must be a string between 2 and 50 characters");
      }
      
      return true;
    }),
];