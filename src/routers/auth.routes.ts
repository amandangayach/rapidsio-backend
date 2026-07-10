import * as authController from "@/controllers/auth.controller";
import { validateUserAccess } from "@/middleware/auth.middleware";
import { Router } from "express";

const authRouter = Router();

authRouter.post("/login", authController.login);
authRouter.post("/register", authController.register);
authRouter.post("/refresh", authController.refreshToken);
authRouter.get("/me", validateUserAccess , authController.getCurrentUser);
authRouter.post("/logout", authController.logout);

export default authRouter; 