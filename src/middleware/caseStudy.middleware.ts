import { body } from "express-validator";

export const validateCaseStudy = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 200 })
    .withMessage("Title must be between 3 and 200 characters"),

  body("subtitle")
    .trim()
    .notEmpty()
    .withMessage("Subtitle is required")
    .isLength({ min: 3, max: 300 })
    .withMessage("Subtitle must be between 3 and 300 characters"),

  body("overview")
    .notEmpty()
    .withMessage("Overview is required")
    .custom((value) => {
      const parsed = JSON.parse(value);
      if (!parsed.content || typeof parsed.content !== "string") {
        throw new Error("Overview content is required");
      }
      if (!Array.isArray(parsed.features)) {
        throw new Error("Overview features must be an array");
      }
      parsed.features.forEach((feature: any, index: number) => {
        if (!feature.icon || !feature.title) {
          throw new Error(
            `Feature at index ${index} must have icon and title`
          );
        }
      });
      return true;
    }),

  body("highlight")
    .notEmpty()
    .withMessage("Highlight is required")
    .custom((value) => {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed.content) || parsed.content.length === 0) {
        throw new Error("Highlight content must be a non-empty array");
      }
      return true;
    }),

  body("challenge")
    .notEmpty()
    .withMessage("Challenge is required")
    .custom((value) => {
      const parsed = JSON.parse(value);
      if (!parsed.subtitle || !Array.isArray(parsed.content)) {
        throw new Error("Challenge must have subtitle and content array");
      }
      if (parsed.content.length === 0) {
        throw new Error("Challenge content cannot be empty");
      }
      return true;
    }),

  body("solution")
    .notEmpty()
    .withMessage("Solution is required")
    .custom((value) => {
      const parsed = JSON.parse(value);
      if (!parsed.subtitle || !Array.isArray(parsed.content)) {
        throw new Error("Solution must have subtitle and content array");
      }
      if (parsed.content.length === 0) {
        throw new Error("Solution content cannot be empty");
      }
      return true;
    }),

  body("quote")
    .notEmpty()
    .withMessage("Quote is required")
    .custom((value) => {
      const parsed = JSON.parse(value);
      if (!parsed.text || !parsed.by || !parsed.position) {
        throw new Error("Quote must have text, by, and position fields");
      }
      return true;
    }),

  body("results")
    .notEmpty()
    .withMessage("Results are required")
    .custom((value) => {
      const parsed = JSON.parse(value);
      if (!parsed.subtitle || !Array.isArray(parsed.content)) {
        throw new Error("Results must have subtitle and content array");
      }
      if (parsed.content.length === 0) {
        throw new Error("Results content cannot be empty");
      }
      return true;
    }),

  body("youtubeUrl")
    .optional()
    .isURL()
    .withMessage("YouTube URL must be a valid URL"),
];
