import { Router } from "express";
import * as CaseStudyController from "@/controllers/caseStudy.controller";
import {
  validateAdminAccess,
  validateSuperAdminAccess,
} from "@/middleware/auth.middleware";
import { upload } from "@/utils/cloudinary.utils";
import { validateCaseStudy } from "@/middleware/caseStudy.middleware";

const caseStudyRouter = Router();

// Public routes
caseStudyRouter.get("/", CaseStudyController.getCaseStudies);
caseStudyRouter.get("/slug/:slug", CaseStudyController.getCaseStudyBySlug);

// Admin only routes
caseStudyRouter.post(
  "/",
  validateAdminAccess,
  upload.caseStudy.fields([
    { name: 'image', maxCount: 1 }
  ]),
  validateCaseStudy,
  CaseStudyController.createCaseStudy
);

caseStudyRouter.get("/admin/all", validateAdminAccess, CaseStudyController.getAllCaseStudiesForAdmin);
caseStudyRouter.get("/admin/:id", validateAdminAccess, CaseStudyController.getCaseStudyByIdForAdmin);
caseStudyRouter.get("/admin/stats", validateAdminAccess, CaseStudyController.getCaseStudyStats);

caseStudyRouter.put(
  "/:id",
  validateAdminAccess,
  upload.caseStudy.fields([
    { name: 'image', maxCount: 1 }
  ]),
  validateCaseStudy,
  CaseStudyController.updateCaseStudy
);

caseStudyRouter.patch(
  "/:id/toggle-status",
  validateAdminAccess,
  CaseStudyController.toggleCaseStudyStatus
);

// Super Admin only routes
caseStudyRouter.delete(
  "/:id",
  validateSuperAdminAccess,
  CaseStudyController.deleteCaseStudy
);

export default caseStudyRouter;
