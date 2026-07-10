import { Router } from "express";
import {
  getDashboardStats,
  getAdminDashboardStats,
  getSuperAdminDashboardStats,
} from "@/controllers/dashboard.controller";
import { validateUserAccess, validateAdminAccess, validateSuperAdminAccess } from "@/middleware/auth.middleware";

const dashboardRouter = Router();

// Public dashboard stats (for authenticated users)
dashboardRouter.get("/", validateUserAccess, getDashboardStats);

// Admin dashboard stats (for admin and super admin)
dashboardRouter.get("/admin", validateAdminAccess, getAdminDashboardStats);

// Super admin dashboard stats (for super admin only)
dashboardRouter.get("/super-admin", validateSuperAdminAccess, getSuperAdminDashboardStats);

export default dashboardRouter;