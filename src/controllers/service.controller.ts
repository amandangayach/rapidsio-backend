import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { Service, EServiceStatus } from "@/models/service.model";
import { cloudinaryUtils } from "@/utils/cloudinary.utils";
import { v2 as cloudinary } from 'cloudinary';

// Assuming ServiceSection model exists or will be created
// import { ServiceSection } from "@/models/serviceSection.model";

// Create service
export const createService = async (req: Request, res: Response) => {
  try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const {
        title,
        subtitle,
        description,
        featuresHeading,
        about,
        features,
        servicesHeading,
        services,
        processHeading,
        processDescription,
        process,
        whyChooseUsHeading,
        whyChooseUsDescription,
        whyChooseUs,
        areasHeading,
        areasDescription,
        areas,
        faqsHeading,
        faqsDescription,
        faqs,
        order,
      } = req.body;

      // Process uploaded files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      // Handle background image
      let aboutData = about;
      if (files.backgroundImage && files.backgroundImage[0]) {
        aboutData = {
          ...about,
          backgroundImage: files.backgroundImage[0].path
        };
      }

      // Handle services images
      let servicesData = services;
      if (files.servicesImages && Array.isArray(services) && files.servicesImages.length > 0) {
        servicesData = services.map((service: any, index: number) => ({
          ...service,
          imageUrl: files.servicesImages[index]?.path || service.imageUrl
        }));
      }

      // Handle process images
      let processData = process;
      if (files.processImages && Array.isArray(process) && files.processImages.length > 0) {
        processData = process.map((step: any, index: number) => ({
          ...step,
          imageUrl: files.processImages[index]?.path || step.imageUrl
        }));
      }

      // Handle areas images
      let areasData = areas;
      if (files.areasImages && Array.isArray(areas) && files.areasImages.length > 0) {
        areasData = areas.map((area: any, index: number) => ({
          ...area,
          imageUrl: files.areasImages[index]?.path || area.imageUrl
        }));
      }

      // Generate slug
      const slug = title
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, "-");

      // Check if slug exists
      const existingService = await Service.findOne({ slug });
      if (existingService) {
        return res.status(400).json({
          success: false,
          message: "A service with this title already exists",
        });
      }

      const service = new Service({
        title,
        subtitle,
        description,
        slug,
        featuresHeading,
        about: aboutData,
        features,
        servicesHeading,
        services: servicesData,
        processHeading,
        processDescription,
        process: processData,
        whyChooseUsHeading,
        whyChooseUsDescription,
        whyChooseUs,
        areasHeading,
        areasDescription,
        areas: areasData,
        faqsHeading,
        faqsDescription,
        faqs,
        order: order || 0,
        status: EServiceStatus.DRAFT, // Default status
      });

      await service.save();

      res.status(201).json({
        success: true,
        message: "Service created successfully",
        data: service,
      });
    } catch (error) {
      console.error("Error creating service:", error);
      res.status(500).json({
        success: false,
        message: "Error creating service",
      });
    }
  }

// Get all services with filters
export const getServices = async (req: Request, res: Response) => {
    try {
      const { status, search } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limitParam = req.query.limit as string;
      const limit = limitParam ? parseInt(limitParam) : undefined;

      const query: any = {};

      // Status filter (for admins, show all. for others, show only live)
      const user = (req as any).user;
      if (user?.role === "Admin" || user?.role === "Super_Admin") {
        // Admins can see all statuses
        if (status) query.status = status;
      } else {
        // Public users only see live services
        query.status = EServiceStatus.LIVE;
      }

      // Search in title, subtitle, or description
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { subtitle: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      let servicesQuery = Service.find(query)
        .sort("order");

      // Only apply pagination if limit is specified
      if (limit) {
        servicesQuery = servicesQuery
          .skip((page - 1) * limit)
          .limit(limit);
      }

      const services = await servicesQuery;
      const total = await Service.countDocuments(query);

      // Build response based on whether pagination was requested
      const responseData: any = {
        services,
      };

      if (limit) {
        responseData.pagination = {
          current: page,
          total: Math.ceil(total / limit),
          totalItems: total,
        };
      } else {
        responseData.totalItems = total;
      }

      res.status(200).json({
        success: true,
        data: responseData,
      });
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching services",
      });
    }
  }

// Get service by slug
export const getServiceBySlug = async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;

      const service = await Service.findOne({ slug });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      // Only return service if it's live
      if (service.status !== EServiceStatus.LIVE) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      res.status(200).json({
        success: true,
        data: service,
      });
    } catch (error) {
      console.error("Error fetching service:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching service",
      });
    }
  }

// Update service
export const updateService = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        title,
        subtitle,
        description,
        featuresHeading,
        about,
        features,
        servicesHeading,
        services,
        processHeading,
        processDescription,
        process,
        whyChooseUsHeading,
        whyChooseUsDescription,
        whyChooseUs,
        areasHeading,
        areasDescription,
        areas,
        faqsHeading,
        faqsDescription,
        faqs,
        order,
        status,
      } = req.body;

      const service = await Service.findById(id);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      // Process uploaded files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      // Handle background image
      let aboutData = about;
      if (files.backgroundImage && files.backgroundImage[0]) {
        aboutData = {
          ...about,
          backgroundImage: files.backgroundImage[0].path
        };
      } else if (req.body.backgroundImage) {
        aboutData = {
          ...about,
          backgroundImage: req.body.backgroundImage
        };
      } else if (about) {
        aboutData = {
          ...about,
          backgroundImage: service.about.backgroundImage
        };
      }

      // Handle services images
      let servicesData = services;
      if (Array.isArray(services)) {
        let fileIndex = 0;
        servicesData = services.map((serviceItem: any, index: number) => {
          let imageUrl = serviceItem.imageUrl;
          if (!imageUrl && files.servicesImages && files.servicesImages[fileIndex]) {
            imageUrl = files.servicesImages[fileIndex].path;
            fileIndex++;
          } else if (req.body.servicesImages && req.body.servicesImages[index]) {
            imageUrl = req.body.servicesImages[index];
          } else if (!imageUrl && service.services[index]) {
            imageUrl = service.services[index].imageUrl;
          }
          if (!imageUrl) {
            throw new Error(`Image URL is required for services item at index ${index}. Please provide an image file or URL.`);
          }
          return { ...serviceItem, imageUrl };
        });
      }

      // Handle process images
      let processData = process;
      if (Array.isArray(process)) {
        let fileIndex = 0;
        processData = process.map((step: any, index: number) => {
          let imageUrl = step.imageUrl;
          if (!imageUrl && files.processImages && files.processImages[fileIndex]) {
            imageUrl = files.processImages[fileIndex].path;
            fileIndex++;
          } else if (req.body.processImages && req.body.processImages[index]) {
            imageUrl = req.body.processImages[index];
          } else if (!imageUrl && service.process[index]) {
            imageUrl = service.process[index].imageUrl;
          }
          if (!imageUrl) {
            throw new Error(`Image URL is required for process item at index ${index}. Please provide an image file or URL.`);
          }
          return { ...step, imageUrl };
        });
      }

      // Handle areas images
      let areasData = areas;
      if (Array.isArray(areas)) {
        let fileIndex = 0;
        areasData = areas.map((area: any, index: number) => {
          let imageUrl = area.imageUrl;
          if (!imageUrl && files.areasImages && files.areasImages[fileIndex]) {
            imageUrl = files.areasImages[fileIndex].path;
            fileIndex++;
          } else if (req.body.areasImages && req.body.areasImages[index]) {
            imageUrl = req.body.areasImages[index];
          } else if (!imageUrl && service.areas[index]) {
            imageUrl = service.areas[index].imageUrl;
          }
          if (!imageUrl) {
            throw new Error(`Image URL is required for areas item at index ${index}. Please provide an image file or URL.`);
          }
          return { ...area, imageUrl };
        });
      }

      // If title is changing, update slug
      if (title && title !== service.title) {
        const newSlug = title
          .toLowerCase()
          .replace(/[^a-zA-Z0-9\s]/g, "")
          .replace(/\s+/g, "-");

        const existingService = await Service.findOne({
          slug: newSlug,
          _id: { $ne: id },
        });

        if (existingService) {
          return res.status(400).json({
            success: false,
            message: "A service with this title already exists",
          });
        }

        service.slug = newSlug;
      }

      // Update fields
      if (title !== undefined) service.title = title;
      if (subtitle !== undefined) service.subtitle = subtitle;
      if (description !== undefined) service.description = description;
      if (featuresHeading !== undefined) service.featuresHeading = featuresHeading;
      if (aboutData !== undefined) service.about = aboutData;
      if (features !== undefined) service.features = features;
      if (servicesHeading !== undefined) service.servicesHeading = servicesHeading;
      if (servicesData !== undefined) service.services = servicesData;
      if (processHeading !== undefined) service.processHeading = processHeading;
      if (processDescription !== undefined) service.processDescription = processDescription;
      if (processData !== undefined) service.process = processData;
      if (whyChooseUsHeading !== undefined) service.whyChooseUsHeading = whyChooseUsHeading;
      if (whyChooseUsDescription !== undefined) service.whyChooseUsDescription = whyChooseUsDescription;
      if (whyChooseUs !== undefined) service.whyChooseUs = whyChooseUs;
      if (areasHeading !== undefined) service.areasHeading = areasHeading;
      if (areasDescription !== undefined) service.areasDescription = areasDescription;
      if (areasData !== undefined) service.areas = areasData;
      if (faqsHeading !== undefined) service.faqsHeading = faqsHeading;
      if (faqsDescription !== undefined) service.faqsDescription = faqsDescription;
      if (faqs !== undefined) service.faqs = faqs;
      if (order !== undefined) service.order = order;
      if (status !== undefined) service.status = status;

      await service.save();

      res.status(200).json({
        success: true,
        message: "Service updated successfully",
        data: service,
      });
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({
        success: false,
        message: "Error updating service",
      });
    }
  }

// Delete service
export const deleteService = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const service = await Service.findById(id);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      // Delete images from Cloudinary
      const imageUrls: string[] = [];

      // Collect all image URLs to delete
      if (service.about?.backgroundImage) {
        imageUrls.push(service.about.backgroundImage);
      }

      if (service.services && Array.isArray(service.services)) {
        service.services.forEach(s => {
          if (s.imageUrl) imageUrls.push(s.imageUrl);
        });
      }

      if (service.process && Array.isArray(service.process)) {
        service.process.forEach(p => {
          if (p.imageUrl) imageUrls.push(p.imageUrl);
        });
      }

      if (service.areas && Array.isArray(service.areas)) {
        service.areas.forEach(a => {
          if (a.imageUrl) imageUrls.push(a.imageUrl);
        });
      }

      // Delete images from Cloudinary
      if (imageUrls.length > 0) {
        try {
          const publicIds = imageUrls
            .map(url => cloudinaryUtils.getPublicIdFromUrl(url))
            .filter(Boolean);

          if (publicIds.length > 0) {
            const deleteResult = await cloudinaryUtils.deleteFiles(publicIds, 'raw');
          }
        } catch (error) {
          console.error('Error deleting images from Cloudinary:', error);
          // Don't fail the service deletion if image deletion fails
        }
      }

      await service.deleteOne();

      res.status(200).json({
        success: true,
        message: "Service deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting service",
      });
    }
  }

// Admin-specific functions

// Get service by ID for admin (can fetch any status)
export const getServiceByIdForAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    console.error("Error fetching service by ID for admin:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching service",
    });
  }
};

// Get all services for admin (no status filtering)
export const getAllServicesForAdmin = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    // Build query - no status filtering for admins
    const query: any = {};

    // Search in title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Execute query with pagination
    const services = await Service.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Get total count for pagination
    const total = await Service.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        services,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalItems: total,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching all services for admin:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching services",
    });
  }
};

// Toggle service status between Draft and Live (Admin only)
export const toggleServiceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First, find the service to check its current status
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Only allow toggling between Draft and Live, not other statuses
    if (service.status === EServiceStatus.INACTIVE || service.status === EServiceStatus.COMING_SOON) {
      return res.status(400).json({
        success: false,
        message: "Cannot toggle status of inactive or coming soon service",
      });
    }

    // Toggle between Draft and Live
    const newStatus = service.status === EServiceStatus.LIVE
      ? EServiceStatus.DRAFT
      : EServiceStatus.LIVE;

    // Use findByIdAndUpdate to avoid validation issues
    const updatedService = await Service.findByIdAndUpdate(
      id,
      { status: newStatus },
      {
        new: true,
        runValidators: false, // Skip validation since we're only updating status
        select: '_id status' // Only select the fields we need
      }
    );

    if (!updatedService) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Service status toggled successfully",
      data: {
        _id: updatedService._id,
        status: updatedService.status,
      },
    });
  } catch (error) {
    console.error("Error toggling service status:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling service status",
    });
  }
};


// Get service stats (Admin only)
export const getServiceStats = async (req: Request, res: Response) => {
  try {
    const stats = await Service.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusStats: stats,
      },
    });
  } catch (error) {
    console.error("Error getting service stats:", error);
    res.status(500).json({
      success: false,
      message: "Error getting service stats",
    });
  }
};
