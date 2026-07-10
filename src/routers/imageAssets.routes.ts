import { Router } from "express";
import {
  createImageAsset,
  getImageAssets,
  getImageAssetById,
  updateImageAsset,
  deleteImageAsset,
  getImageAssetStats,
  bulkDeleteImageAssets,
} from "@/controllers/imageAssets.controller";
import {
  validateAdminAccess,
  validateSuperAdminAccess,
} from "@/middleware/auth.middleware";
import { upload } from "@/utils/cloudinary.utils";
import { validateImageAsset } from "@/middleware/imageAssets.middleware";

const imageAssetsRouter = Router();

// All routes below this middleware require admin access
imageAssetsRouter.use(validateAdminAccess)

// Routes for image assets
imageAssetsRouter.get("/", getImageAssets);
imageAssetsRouter.get("/:id", getImageAssetById);

// Admin routes for creating and managing image assets
imageAssetsRouter.post(
  "/create",
  validateAdminAccess,
  upload.imageAssets.single('image'),
  validateImageAsset,
  createImageAsset
);

imageAssetsRouter.put(
  "/:id",
  validateAdminAccess,
  upload.imageAssets.single('image'),
  validateImageAsset,
  updateImageAsset
);

imageAssetsRouter.delete(
  "/:id",
  validateAdminAccess,
  deleteImageAsset
);

// Admin only routes
imageAssetsRouter.get("/admin/stats", validateAdminAccess, getImageAssetStats);
imageAssetsRouter.post("/admin/bulk-delete", validateAdminAccess, bulkDeleteImageAssets);

export default imageAssetsRouter;