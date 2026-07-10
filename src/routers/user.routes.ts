import { Router } from "express";
import {
  getAllUsers,
  verifyUser,
  changeUserRole,
  getUserById,
} from "@/controllers/user.controller";
import { validateSuperAdminAccess } from "@/middleware/auth.middleware";

const userRouter = Router();

// All user management routes require super admin access
userRouter.use(validateSuperAdminAccess);

// Get all users with pagination and filtering
userRouter.get("/", getAllUsers);

// Get specific user by ID
userRouter.get("/:id", getUserById);

// Verify or unverify a user
userRouter.put("/:id/verify", verifyUser);

// Change user role
userRouter.put("/:id/role", changeUserRole);

export default userRouter;