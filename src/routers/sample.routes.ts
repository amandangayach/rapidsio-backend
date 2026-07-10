import { Router } from "express";
import { 
  createSample,
  getSamples,
  getSampleBySlug,
  updateSample,
  deleteSample,
  getSampleByIdForAdmin,
  archiveSample,
  toggleSampleStatus,
  getAllSamplesForAdmin,
  getSampleStats,
  getSubjectCounts,
} from "@/controllers/sample.controller";
import { validateSample, validateFAQ } from "@/middleware/sample.middleware";
import { validateAdminAccess, validateSuperAdminAccess } from "@/middleware/auth.middleware";
import { upload } from "@/utils/cloudinary.utils";

const router = Router();

// Public routes
router.get("/", getSamples);
router.get("/:slug", getSampleBySlug);
router.get("/subjects/counts", getSubjectCounts);

// Protected routes (Admin and Super Admin only)
router.post(
  "/",
  validateAdminAccess,
  upload.sample.single("content"),
  validateSample,
  createSample
);

router.put(
  "/:id",
  validateAdminAccess,
  upload.sample.single("content"),
  validateSample,
  updateSample
);

// Super Admin only routes
router.delete(
  "/:id",
  validateSuperAdminAccess,
  deleteSample
);

// Admin only routes
router.get(
  "/admin/stats",
  validateAdminAccess,
  getSampleStats
);

router.get(
  "/admin/all",
  validateAdminAccess,
  getAllSamplesForAdmin
);

router.get(
  "/admin/:id",
  validateAdminAccess,
  getSampleByIdForAdmin
);

router.patch(
  "/:id/toggle-status",
  validateAdminAccess,
  toggleSampleStatus
);

router.patch(
  "/:id/archive",
  validateAdminAccess,
  archiveSample
);

export default router;
