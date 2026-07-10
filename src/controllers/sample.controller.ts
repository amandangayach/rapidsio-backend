import { Request, Response } from "express";
import { validationResult } from "express-validator";
import Sample, { ESampleStatus } from "@/models/sample.model";
import { cloudinaryUtils } from "@/utils/cloudinary.utils";
import { v2 as cloudinary } from 'cloudinary';

// Create sample
export const createSample = async (req: Request, res: Response) => {
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
      content,
      subject,
      topic,
      academicLevel,
      wordCount,
      referenceCount,
      faqs,
    } = req.body;

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "-");

    // Check if slug exists
    const existingSample = await Sample.findOne({ slug });
    if (existingSample) {
      return res.status(400).json({
        success: false,
        message: "A sample with this title already exists",
      });
    }

    // Handle content upload to Cloudinary
    let contentUrl: string | undefined;
    if (content) {
      if (content.startsWith('http')) {
        contentUrl = content;
      } else {
        const publicId = `content/samples/${slug}-content.md`;
        try {
          const uploadResult = await cloudinary.uploader.upload(`data:text/markdown;base64,${Buffer.from(content).toString('base64')}`, {
            resource_type: 'raw',
            public_id: publicId,
            folder: 'ping-assignments/content/samples',
          });
          contentUrl = uploadResult.secure_url;
        } catch (error) {
          console.error('Error uploading content to Cloudinary:', error);
          return res.status(500).json({
            success: false,
            message: "Error uploading content",
          });
        }
      }
    }

    const sample = new Sample({
      title,
      subtitle,
      description,
      slug,
      contentUrl,
      subject,
      topic,
      academicLevel,
      wordCount,
      referenceCount,
      faqs,
      status: ESampleStatus.DRAFT,
    });

    await sample.save();

    res.status(201).json({
      success: true,
      message: "Sample created successfully",
      data: sample,
    });
  } catch (error) {
    console.error("Error creating sample:", error);
    res.status(500).json({
      success: false,
      message: "Error creating sample",
    });
  }
};

// Get all samples with filters
export const getSamples = async (req: Request, res: Response) => {
  try {
    const {
      subject,
      topic,
      academicLevel,
      status = ESampleStatus.PUBLISHED,
      sort = "rating",
    } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Build query
    const query: any = {};
    if (subject) query.subject = subject;
    if (topic) query.topic = topic;
    if (academicLevel) query.academicLevel = academicLevel;

    // Status filter (for admins, show all. for others, show only published)
    const user = (req as any).user;
    if (user?.role === "Admin" || user?.role === "Super_Admin") {
      if (status) query.status = status;
    } else {
      query.status = ESampleStatus.PUBLISHED;
    }

    // Build sort
    let sortQuery: any = {};
    switch (sort) {
      case "rating":
        sortQuery = { "rating.score": -1 };
        break;
      case "recent":
        sortQuery = { createdAt: -1 };
        break;
      case "views":
        sortQuery = { views: -1 };
        break;
      default:
        sortQuery = { "rating.score": -1 };
    }

    const samples = await Sample.find(query)
      .sort(sortQuery)
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Sample.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        samples,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalItems: total,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching samples:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching samples",
    });
  }
};

// Get sample by slug
export const getSampleBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const sample = await Sample.findOne({ slug });
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: "Sample not found",
      });
    }

    // Check if user is admin or sample is published
    const user = (req as any).user;
    if (sample.status !== ESampleStatus.PUBLISHED && 
        user?.role !== "Admin" && 
        user?.role !== "Super_Admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this sample",
      });
    }

    res.status(200).json({
      success: true,
      data: sample,
    });
  } catch (error) {
    console.error("Error fetching sample:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching sample",
    });
  }
};

// Update sample
export const updateSample = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      description,
      content,
      subject,
      topic,
      academicLevel,
      wordCount,
      referenceCount,
      faqs,
      status,
    } = req.body;

    const sample = await Sample.findById(id);
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: "Sample not found",
      });
    }

    // If title is changing, update slug
    if (title && title !== sample.title) {
      const newSlug = title
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, "-");

      const existingSample = await Sample.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });

      if (existingSample) {
        return res.status(400).json({
          success: false,
          message: "A sample with this title already exists",
        });
      }

      sample.slug = newSlug;
    }

    // Process content - either upload new content or keep existing URL
    let contentUrl = content;

    // If content has changed and is not a URL (actual markdown content)
    if (content !== undefined && content !== sample.content && !content.startsWith('http')) {
      // Upload new markdown content to Cloudinary
      const publicId = `content/samples/${sample.slug}-content.md`;
      try {
        const uploadResult = await cloudinary.uploader.upload(`data:text/markdown;base64,${Buffer.from(content).toString('base64')}`, {
          resource_type: 'raw',
          public_id: publicId,
          folder: 'ping-assignments/content/samples',
        });
        contentUrl = uploadResult.secure_url;

        // Delete old content if it exists and is a URL
        if (sample.contentUrl && sample.contentUrl.startsWith('http')) {
          const oldPublicId = cloudinaryUtils.getPublicIdFromUrl(sample.contentUrl);
          await cloudinaryUtils.deleteFile(oldPublicId, "raw");
        }
      } catch (error) {
        console.error('Error uploading content to Cloudinary:', error);
        return res.status(500).json({
          success: false,
          message: "Error uploading content",
        });
      }
    }

    // Update contentUrl if it changed
    if (contentUrl !== undefined) {
      sample.contentUrl = contentUrl;
    }

    // Update fields
    sample.title = title || sample.title;
    sample.subtitle = subtitle || sample.subtitle;
    sample.description = description || sample.description;
    sample.subject = subject || sample.subject;
    sample.topic = topic || sample.topic;
    sample.academicLevel = academicLevel || sample.academicLevel;
    sample.wordCount = wordCount || sample.wordCount;
    sample.referenceCount = referenceCount || sample.referenceCount;
    sample.faqs = faqs || sample.faqs;

    // Only admins can change status
    const user = (req as any).user;
    if (status && (user?.role === "Admin" || user?.role === "Super_Admin")) {
      sample.status = status;
    }

    await sample.save();

    res.status(200).json({
      success: true,
      message: "Sample updated successfully",
      data: sample,
    });
  } catch (error) {
    console.error("Error updating sample:", error);
    res.status(500).json({
      success: false,
      message: "Error updating sample",
    });
  }
};

// Delete sample
export const deleteSample = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const sample = await Sample.findById(id);
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: "Sample not found",
      });
    }

    // Delete content file from Cloudinary
    if (sample.contentUrl) {
      const publicId = cloudinaryUtils.getPublicIdFromUrl(sample.contentUrl);
      await cloudinaryUtils.deleteFile(publicId, "raw");
    }

    await sample.deleteOne();

    res.status(200).json({
      success: true,
      message: "Sample deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting sample:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting sample",
    });
  }
};

// Get sample by ID (Admin only - can fetch any status)
export const getSampleByIdForAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sample = await Sample.findById(id);

    if (!sample) {
      return res.status(404).json({
        success: false,
        message: "Sample not found",
      });
    }

    res.status(200).json({
      success: true,
      data: sample,
    });
  } catch (error) {
    console.error("Error fetching sample:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching sample",
    });
  }
};

// Archive sample (Admin only)
export const archiveSample = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const sample = await Sample.findById(id);
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: "Sample not found",
      });
    }

    sample.status = ESampleStatus.ARCHIVED;
    await sample.save();

    res.status(200).json({
      success: true,
      message: "Sample archived successfully",
    });
  } catch (error) {
    console.error("Error archiving sample:", error);
    res.status(500).json({
      success: false,
      message: "Error archiving sample",
    });
  }
};

// Toggle sample status between Draft and Published (Admin only)
export const toggleSampleStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First, find the sample to check its current status
    const sample = await Sample.findById(id);
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: "Sample not found",
      });
    }

    // Only allow toggling between Draft and Published, not Archived
    if (sample.status === ESampleStatus.ARCHIVED) {
      return res.status(400).json({
        success: false,
        message: "Cannot toggle status of archived sample",
      });
    }

    // Toggle between Draft and Published
    const newStatus = sample.status === ESampleStatus.PUBLISHED
      ? ESampleStatus.DRAFT
      : ESampleStatus.PUBLISHED;

    // Use findByIdAndUpdate to avoid validation issues
    const updatedSample = await Sample.findByIdAndUpdate(
      id,
      { status: newStatus },
      {
        new: true,
        runValidators: false,
        select: '_id status'
      }
    );

    if (!updatedSample) {
      return res.status(404).json({
        success: false,
        message: "Sample not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Sample status toggled successfully",
      data: {
        _id: updatedSample._id,
        status: updatedSample.status,
      },
    });
  } catch (error) {
    console.error("Error toggling sample status:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling sample status",
    });
  }
};

// Get all samples for admin (no status filtering)
export const getAllSamplesForAdmin = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const subject = req.query.subject as string;
    const topic = req.query.topic as string;
    const academicLevel = req.query.academicLevel as string;
    const search = req.query.search as string;

    // Build query - no status filtering for admins
    const query: any = {};

    if (subject) query.subject = subject;
    if (topic) query.topic = topic;
    if (academicLevel) query.academicLevel = academicLevel;

    // Search in title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Execute query with pagination
    const samples = await Sample.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Get total count for pagination
    const total = await Sample.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        samples,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalItems: total,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching all samples for admin:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching samples",
    });
  }
};

// Get sample stats (Admin only)
export const getSampleStats = async (req: Request, res: Response) => {
  try {
    const stats = await Sample.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const subjectStats = await Sample.aggregate([
      {
        $group: {
          _id: "$subject",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusStats: stats,
        popularSubjects: subjectStats,
      },
    });
  } catch (error) {
    console.error("Error getting sample stats:", error);
    res.status(500).json({
      success: false,
      message: "Error getting sample stats",
    });
  }
};

// Get subject counts for all subjects (Public)
export const getSubjectCounts = async (req: Request, res: Response) => {
  try {
    const subjectStats = await Sample.aggregate([
      {
        $match: { status: ESampleStatus.PUBLISHED } // Only count published samples
      },
      {
        $group: {
          _id: "$subject",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } }, // Sort alphabetically by subject name
    ]);

    res.status(200).json({
      success: true,
      data: subjectStats,
    });
  } catch (error) {
    console.error("Error getting subject counts:", error);
    res.status(500).json({
      success: false,
      message: "Error getting subject counts",
    });
  }
};
