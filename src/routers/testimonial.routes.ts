import { Router } from "express";
import {
  createTestimonial,
  getTestimonials,
  getAllTestimonialsForAdmin,
  getTestimonialById,
  updateTestimonial,
  deleteTestimonial,
  getHomepageTestimonials,
  changeTestimonialStatus,
  toggleTestimonialForHomepage,
} from "@/controllers/testimonials.controller";
import {
  validateAdminAccess,
  validateSuperAdminAccess,
} from "@/middleware/auth.middleware";
import { upload } from "@/utils/cloudinary.utils";

const testimonialRouter = Router();

// Public routes
testimonialRouter.get("/", getTestimonials);
testimonialRouter.get("/homepage", getHomepageTestimonials);

// Admin only routes
testimonialRouter.get("/:id",validateAdminAccess, getTestimonialById);
testimonialRouter.get("/admin/all", validateAdminAccess, getAllTestimonialsForAdmin);
testimonialRouter.post(
  "/",
  validateAdminAccess,
  upload.testimonial.fields([
    { name: 'image', maxCount: 1 }
  ]),
  createTestimonial
);

testimonialRouter.put(
  "/:id",
  validateAdminAccess,
  upload.testimonial.fields([
    { name: 'image', maxCount: 1 }
  ]),
  updateTestimonial
);

// Admin routes for status and homepage management
testimonialRouter.patch("/:id/status", validateAdminAccess, changeTestimonialStatus);
testimonialRouter.patch("/:id/toggle-homepage", validateAdminAccess, toggleTestimonialForHomepage);

// Super Admin only routes
testimonialRouter.delete("/:id", validateSuperAdminAccess, deleteTestimonial);

export default testimonialRouter;
