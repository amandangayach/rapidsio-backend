import { Router } from "express";
import * as ServiceController from "@/controllers/service.controller";
import {
  validateAdminAccess,
  validateSuperAdminAccess,
} from "@/middleware/auth.middleware";
import { upload } from "@/utils/cloudinary.utils";
import { validateService, validateServiceSection, validateServiceFaq } from "@/middleware/service.middleware";

const serviceRouter = Router();

// Service Routes
serviceRouter.post(
  "/",
  validateAdminAccess,
  upload.service.fields([
    { name: 'backgroundImage', maxCount: 1 },
    { name: 'servicesImages', maxCount: 10 },
    { name: 'processImages', maxCount: 10 },
    { name: 'areasImages', maxCount: 10 }
  ]),
  validateService,
  ServiceController.createService
);

serviceRouter.get("/", ServiceController.getServices);

serviceRouter.get("/slug/:slug", ServiceController.getServiceBySlug);

serviceRouter.put(
  "/:id",
  validateAdminAccess,
  upload.service.fields([
    { name: 'backgroundImage', maxCount: 1 },
    { name: 'servicesImages', maxCount: 10 },
    { name: 'processImages', maxCount: 10 },
    { name: 'areasImages', maxCount: 10 }
  ]),
  validateService,
  ServiceController.updateService
);

// Admin only routes
serviceRouter.get("/admin/all", validateAdminAccess, ServiceController.getAllServicesForAdmin);
serviceRouter.get("/admin/:id", validateAdminAccess, ServiceController.getServiceByIdForAdmin);
serviceRouter.get("/stats", validateAdminAccess, ServiceController.getServiceStats);
serviceRouter.patch("/:id/toggle-status", validateAdminAccess, ServiceController.toggleServiceStatus);

// Super Admin only routes
serviceRouter.delete(
  "/:id",
  validateSuperAdminAccess,
  ServiceController.deleteService
);

export default serviceRouter;
