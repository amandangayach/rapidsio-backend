import { Request, Response } from "express";
import Testimonial from "@/models/testimonials.model";
import { upload, cloudinaryUtils, getPublicIdFromUrl } from "@/utils/cloudinary.utils";

// Create new testimonial
export const createTestimonial = async (req: Request, res: Response) => {
  try {
    const { name, content, stars, location, forHomepage, status } = req.body;

    // Validate stars field
    if (!stars || stars < 1 || stars > 5) {
      return res.status(400).json({
        success: false,
        message: "Stars field is required and must be between 1 and 5",
      });
    }

    // Handle image upload
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const imageFile = files?.image?.[0];
    const imageUrl = imageFile ? imageFile.path : undefined;

    const testimonial = new Testimonial({
      name,
      content,
      stars: parseInt(stars),
      location,
      imageUrl,
      status: status || "draft",
      forHomepage: forHomepage || false,
    });

    await testimonial.save();

    res.status(201).json({
      success: true,
      message: "Testimonial created successfully",
      data: testimonial,
    });
  } catch (error) {
    console.error("Error creating testimonial:", error);
    res.status(500).json({
      success: false,
      message: "Error creating testimonial",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Get all testimonials (with pagination and filters)
export const getTestimonials = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const forHomepage = req.query.forHomepage as string;

    const query: any = { status: "published" }; // Only show published testimonials for public
    if (forHomepage !== undefined) {
      query.forHomepage = forHomepage === 'true';
    }

    const testimonials = await Testimonial.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Testimonial.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        testimonials,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalItems: total,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching testimonials",
    });
  }
};

// Get all testimonials for admin (with pagination and filters)
export const getAllTestimonialsForAdmin = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const forHomepage = req.query.forHomepage as string;
    const status = req.query.status as string;

    const query: any = {};
    if (forHomepage !== undefined) {
      query.forHomepage = forHomepage === 'true';
    }
    if (status) {
      query.status = status;
    }

    const testimonials = await Testimonial.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Testimonial.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        testimonials,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalItems: total,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching testimonials for admin:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching testimonials for admin",
    });
  }
};

// Get single testimonial by ID
export const getTestimonialById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const testimonial = await Testimonial.findById(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    res.status(200).json({
      success: true,
      data: testimonial,
    });
  } catch (error) {
    console.error("Error fetching testimonial:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching testimonial",
    });
  }
};

// Update testimonial
export const updateTestimonial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, content, stars, location, forHomepage, status } = req.body;

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    // Validate stars field if provided
    if (stars !== undefined && (stars < 1 || stars > 5)) {
      return res.status(400).json({
        success: false,
        message: "Stars must be between 1 and 5",
      });
    }

    // Handle image update
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const imageFile = files?.image?.[0];
    if (imageFile) {
      // Delete old image if exists
      if (testimonial.imageUrl) {
        const publicId = getPublicIdFromUrl(testimonial.imageUrl);
        if (publicId) {
          await cloudinaryUtils.deleteFile(publicId);
        }
      }
      testimonial.imageUrl = imageFile.path;
    }

    testimonial.name = name || testimonial.name;
    testimonial.content = content || testimonial.content;
    testimonial.stars = stars !== undefined ? parseInt(stars) : testimonial.stars;
    testimonial.location = location !== undefined ? location : testimonial.location;
    testimonial.forHomepage = forHomepage !== undefined ? forHomepage : testimonial.forHomepage;
    testimonial.status = status || testimonial.status;

    await testimonial.save();

    res.status(200).json({
      success: true,
      message: "Testimonial updated successfully",
      data: testimonial,
    });
  } catch (error) {
    console.error("Error updating testimonial:", error);
    res.status(500).json({
      success: false,
      message: "Error updating testimonial",
    });
  }
};

// Delete testimonial
export const deleteTestimonial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    // Delete image if exists
    if (testimonial.imageUrl) {
      const publicId = getPublicIdFromUrl(testimonial.imageUrl);
      if (publicId) {
        await cloudinaryUtils.deleteFile(publicId);
      }
    }

    await Testimonial.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Testimonial deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting testimonial",
    });
  }
};

// Get homepage testimonials
export const getHomepageTestimonials = async (req: Request, res: Response) => {
  try {
    const testimonials = await Testimonial.find({ 
      forHomepage: true,
      status: "published"
    })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: testimonials,
    });
  } catch (error) {
    console.error("Error fetching homepage testimonials:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching homepage testimonials",
    });
  }
};

// Change testimonial status
export const changeTestimonialStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["draft", "published", "archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'draft', 'published', or 'archived'",
      });
    }

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    testimonial.status = status;
    await testimonial.save();

    res.status(200).json({
      success: true,
      message: `Testimonial status changed to ${status}`,
      data: testimonial,
    });
  } catch (error) {
    console.error("Error changing testimonial status:", error);
    res.status(500).json({
      success: false,
      message: "Error changing testimonial status",
    });
  }
};

// Toggle testimonial for homepage
export const toggleTestimonialForHomepage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    testimonial.forHomepage = !testimonial.forHomepage;
    await testimonial.save();

    res.status(200).json({
      success: true,
      message: `Testimonial ${testimonial.forHomepage ? 'added to' : 'removed from'} homepage`,
      data: testimonial,
    });
  } catch (error) {
    console.error("Error toggling testimonial for homepage:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling testimonial for homepage",
    });
  }
};
