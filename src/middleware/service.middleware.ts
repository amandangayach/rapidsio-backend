import { body } from "express-validator";

// Validation middleware for sections
export const validateServiceSection = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Section name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Section name must be between 3 and 100 characters"),
  
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
  
  body("order")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Order must be a non-negative integer"),

  body("icon")
    .optional()
];

// Validation middleware for services
export const validateService = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 200 })
    .withMessage("Title must be between 3 and 200 characters"),
  
  body("subtitle")
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage("Subtitle must not exceed 300 characters"),
  
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),
  
  body("about")
    .optional()
    .isObject()
    .withMessage("About must be an object")
    .custom((value) => {
      if (!value.title || typeof value.title !== 'string' || value.title.length < 1 || value.title.length > 200) {
        throw new Error("About title is required and must be between 1 and 200 characters");
      }
      if (!value.content || typeof value.content !== 'string' || value.content.length < 1 || value.content.length > 2000) {
        throw new Error("About content is required and must be between 1 and 2000 characters");
      }
      // backgroundImage is now optional since it's uploaded as a file
      if (value.backgroundImage && (typeof value.backgroundImage !== 'string' || !value.backgroundImage.startsWith('http'))) {
        throw new Error("About backgroundImage must be a valid URL if provided");
      }
      return true;
    }),
  
  body("features")
    .optional()
    .isArray()
    .withMessage("Features must be an array")
    .custom((value) => {
      if (!Array.isArray(value)) return false;
      value.forEach((feature, index) => {
        if (typeof feature !== 'object' || !feature) {
          throw new Error(`Feature at index ${index} must be an object`);
        }
        if (!feature.icon || typeof feature.icon !== 'string' || feature.icon.length < 1) {
          throw new Error(`Feature at index ${index} must have a valid icon`);
        }
        if (!feature.title || typeof feature.title !== 'string' || feature.title.length < 1 || feature.title.length > 100) {
          throw new Error(`Feature at index ${index} title must be between 1 and 100 characters`);
        }
        if (!feature.content || typeof feature.content !== 'string' || feature.content.length < 1 || feature.content.length > 500) {
          throw new Error(`Feature at index ${index} content must be between 1 and 500 characters`);
        }
      });
      return true;
    }),
  
  body("services")
    .optional()
    .isArray()
    .withMessage("Services must be an array")
    .custom((value) => {
      if (!Array.isArray(value)) return false;
      value.forEach((service, index) => {
        if (typeof service !== 'object' || !service) {
          throw new Error(`Service at index ${index} must be an object`);
        }
        if (!service.title || typeof service.title !== 'string' || service.title.length < 1 || service.title.length > 100) {
          throw new Error(`Service at index ${index} title must be between 1 and 100 characters`);
        }
        // imageUrl is now optional since it's uploaded as a file
        if (service.imageUrl && (typeof service.imageUrl !== 'string' || !service.imageUrl.startsWith('http'))) {
          throw new Error(`Service at index ${index} imageUrl must be a valid URL if provided`);
        }
        if (!service.content || typeof service.content !== 'string' || service.content.length < 1 || service.content.length > 1000) {
          throw new Error(`Service at index ${index} content must be between 1 and 1000 characters`);
        }
      });
      return true;
    }),
  
  body("process")
    .optional()
    .isArray()
    .withMessage("Process must be an array")
    .custom((value) => {
      if (!Array.isArray(value)) return false;
      value.forEach((step, index) => {
        if (typeof step !== 'object' || !step) {
          throw new Error(`Process step at index ${index} must be an object`);
        }
        if (!step.title || typeof step.title !== 'string' || step.title.length < 1 || step.title.length > 100) {
          throw new Error(`Process step at index ${index} title must be between 1 and 100 characters`);
        }
        if (!step.content || typeof step.content !== 'string' || step.content.length < 1 || step.content.length > 1000) {
          throw new Error(`Process step at index ${index} content must be between 1 and 1000 characters`);
        }
        // imageUrl is now optional since it's uploaded as a file
        if (step.imageUrl && (typeof step.imageUrl !== 'string' || !step.imageUrl.startsWith('http'))) {
          throw new Error(`Process step at index ${index} imageUrl must be a valid URL if provided`);
        }
      });
      return true;
    }),
  
  body("whyChooseUs")
    .optional()
    .isArray()
    .withMessage("WhyChooseUs must be an array")
    .custom((value) => {
      if (!Array.isArray(value)) return false;
      value.forEach((item, index) => {
        if (typeof item !== 'object' || !item) {
          throw new Error(`WhyChooseUs item at index ${index} must be an object`);
        }
        if (!item.title || typeof item.title !== 'string' || item.title.length < 1 || item.title.length > 100) {
          throw new Error(`WhyChooseUs item at index ${index} title must be between 1 and 100 characters`);
        }
        if (!item.content || typeof item.content !== 'string' || item.content.length < 1 || item.content.length > 500) {
          throw new Error(`WhyChooseUs item at index ${index} content must be between 1 and 500 characters`);
        }
      });
      return true;
    }),
  
  body("areas")
    .optional()
    .isArray()
    .withMessage("Areas must be an array")
    .custom((value) => {
      if (!Array.isArray(value)) return false;
      value.forEach((area, index) => {
        if (typeof area !== 'object' || !area) {
          throw new Error(`Area at index ${index} must be an object`);
        }
        if (!area.title || typeof area.title !== 'string' || area.title.length < 1 || area.title.length > 100) {
          throw new Error(`Area at index ${index} title must be between 1 and 100 characters`);
        }
        // imageUrl is now optional since it's uploaded as a file
        if (area.imageUrl && (typeof area.imageUrl !== 'string' || !area.imageUrl.startsWith('http'))) {
          throw new Error(`Area at index ${index} imageUrl must be a valid URL if provided`);
        }
      });
      return true;
    }),
  
  body("order")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Order must be a non-negative integer"),
];

// Validation middleware for FAQ operations
export const validateServiceFaq = [
  body("question")
    .trim()
    .notEmpty()
    .withMessage("Question is required")
    .isLength({ min: 5, max: 500 })
    .withMessage("Question must be between 5 and 500 characters"),
  
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