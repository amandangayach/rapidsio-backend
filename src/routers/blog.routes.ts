import { Router } from "express";
import {
  createBlog,
  getBlogs,
  getBlogBySlug,
  getBlogByIdForAdmin,
  updateBlog,
  archiveBlog,
  deleteBlog,
  getBlogStats,
  getAllBlogsForAdmin,
  toggleBlogStatus,
} from "@/controllers/blog.controller";
import {
  validateUserAccess,
  validateAdminAccess,
  validateSuperAdminAccess,
} from "@/middleware/auth.middleware";
import { upload } from "@/utils/cloudinary.utils";
import { validateBlog } from "@/middleware/blog.middleware";

const blogRouter = Router();

// Public routes
blogRouter.get("/", getBlogs); // Public can see published blogs
blogRouter.get("/slug/:slug", getBlogBySlug);

// Protected routes (logged in users)
blogRouter.post(
  "/create",
  validateAdminAccess,
  upload.blog.fields([
    { name: 'thumbnail', maxCount: 1 }
  ]),
  validateBlog,
  createBlog
);

blogRouter.put(
  "/:id",
  validateAdminAccess,
  upload.blog.fields([
    { name: 'thumbnail', maxCount: 1 }
  ]),
  validateBlog,
  updateBlog
);

// Admin only routes
blogRouter.get("/admin/all", validateAdminAccess, getAllBlogsForAdmin);
blogRouter.get("/admin/:id", validateAdminAccess, getBlogByIdForAdmin);
blogRouter.get("/stats", validateAdminAccess, getBlogStats);
blogRouter.patch("/:id/archive", validateAdminAccess, archiveBlog);
blogRouter.patch("/:id/toggle-status", validateAdminAccess, toggleBlogStatus);

// Super Admin only routes
blogRouter.delete("/:id", validateSuperAdminAccess, deleteBlog);

export default blogRouter;
