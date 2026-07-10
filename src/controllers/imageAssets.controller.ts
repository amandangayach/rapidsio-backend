import { Request, Response } from "express";
import { validationResult } from "express-validator";
import ImageAsset, { IImageAsset } from "@/models/imageAssets.model";
import { cloudinaryUtils } from "@/utils/cloudinary.utils";

// Create new image asset
export const createImageAsset = async (req: Request, res: Response) => {
  try {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { name, altText } = req.body;

    // Check if image file is uploaded
    const imageFile = req.file;
    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    // Create image asset with Cloudinary URL and public ID
    const imageAsset = new ImageAsset({
      name,
      url: imageFile.path, // Cloudinary URL
      altText,
      publicId: imageFile.filename, // Store the public ID from Cloudinary
    });

    await imageAsset.save();

    res.status(201).json({
      success: true,
      message: "Image asset created successfully",
      data: imageAsset,
    });
  } catch (error) {
    console.error("Error creating image asset:", error);
    res.status(500).json({
      success: false,
      message: "Error creating image asset",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Get all image assets (with pagination)
export const getImageAssets = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    // Build query
    const query: any = {};
    
    // Search in name or altText
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { altText: { $regex: search, $options: "i" } },
      ];
    }

    // Execute query with pagination
    const imageAssets = await ImageAsset.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Get total count for pagination
    const total = await ImageAsset.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        imageAssets,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalItems: total,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching image assets:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching image assets",
    });
  }
};

// Get single image asset by ID
export const getImageAssetById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const imageAsset = await ImageAsset.findById(id);

    if (!imageAsset) {
      return res.status(404).json({
        success: false,
        message: "Image asset not found",
      });
    }

    res.status(200).json({
      success: true,
      data: imageAsset,
    });
  } catch (error) {
    console.error("Error fetching image asset:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching image asset",
    });
  }
};

// Update image asset
export const updateImageAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, altText } = req.body;

    const imageAsset = await ImageAsset.findById(id);
    if (!imageAsset) {
      return res.status(404).json({
        success: false,
        message: "Image asset not found",
      });
    }

    // Handle image update if new file is uploaded
    const imageFile = req.file;
    if (imageFile) {
      // Delete old image from Cloudinary using stored public ID
      if (imageAsset.publicId) {
        try {
          await cloudinaryUtils.deleteImageAsset(imageAsset.publicId);
        } catch (error) {
          console.warn("Failed to delete old image from Cloudinary:", error);
        }
      }
      
      // Update with new image URL and public ID
      imageAsset.url = imageFile.path;
      imageAsset.publicId = imageFile.filename;
    }

    // Update other fields
    imageAsset.name = name || imageAsset.name;
    imageAsset.altText = altText || imageAsset.altText;

    await imageAsset.save();

    res.status(200).json({
      success: true,
      message: "Image asset updated successfully",
      data: imageAsset,
    });
  } catch (error) {
    console.error("Error updating image asset:", error);
    res.status(500).json({
      success: false,
      message: "Error updating image asset",
    });
  }
};

// Delete image asset
export const deleteImageAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const imageAsset = await ImageAsset.findById(id);
    if (!imageAsset) {
      return res.status(404).json({
        success: false,
        message: "Image asset not found",
      });
    }

    // Delete image from Cloudinary using stored public ID
    if (imageAsset.publicId) {
      try {
        await cloudinaryUtils.deleteImageAsset(imageAsset.publicId);
      } catch (error) {
        console.warn("Failed to delete image from Cloudinary:", error);
      }
    }

    // Delete from database
    await ImageAsset.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Image asset deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting image asset:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting image asset",
    });
  }
};

// Get image asset stats (Admin only)
export const getImageAssetStats = async (req: Request, res: Response) => {
  try {
    const totalAssets = await ImageAsset.countDocuments();
    
    // Get storage usage from Cloudinary (if needed)
    const recentAssets = await ImageAsset.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name url createdAt');

    res.status(200).json({
      success: true,
      data: {
        totalAssets,
        recentAssets,
      },
    });
  } catch (error) {
    console.error("Error fetching image asset stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching image asset stats",
    });
  }
};

// Bulk delete image assets (Admin only)
export const bulkDeleteImageAssets = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of image asset IDs",
      });
    }

    // Find all image assets to get their URLs for Cloudinary deletion
    const imageAssets = await ImageAsset.find({ _id: { $in: ids } });
    
    // Collect public IDs for Cloudinary deletion
    const publicIds: string[] = [];
    imageAssets.forEach(asset => {
      if (asset.publicId) {
        publicIds.push(asset.publicId);
      }
    });

    // Delete from Cloudinary using dedicated image assets function
    if (publicIds.length > 0) {
      try {
        await cloudinaryUtils.deleteImageAssets(publicIds);
      } catch (error) {
        console.warn("Failed to delete some images from Cloudinary:", error);
      }
    }

    // Delete from database
    const result = await ImageAsset.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} image assets deleted successfully`,
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    console.error("Error bulk deleting image assets:", error);
    res.status(500).json({
      success: false,
      message: "Error bulk deleting image assets",
    });
  }
};
