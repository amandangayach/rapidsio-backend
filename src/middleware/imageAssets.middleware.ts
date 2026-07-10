import { body } from "express-validator";

export const validateImageAsset = [
  body("name")
    .notEmpty()
    .withMessage("Image name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Image name must be between 1 and 100 characters"),
  
  body("altText")
    .notEmpty()
    .withMessage("Alt text is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Alt text must be between 1 and 200 characters"),
];