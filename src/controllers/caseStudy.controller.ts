import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { CaseStudy, ECaseStudyStatus, ICaseStudy } from "@/models/caseStudy.model";

// Create case study
export const createCaseStudy = async (req: Request, res: Response) => {
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
      imageUrl,
      youtubeUrl,
      overview,
      highlight,
      challenge,
      solution,
      quote,
      results,
    } = req.body;

    // Handle uploaded file
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let finalImageUrl = imageUrl;
    
    if (files.image && files.image[0]) {
      finalImageUrl = files.image[0].path;
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "-");

    // Check if slug already exists
    const existingCaseStudy = await CaseStudy.findOne({ slug });
    if (existingCaseStudy) {
      return res.status(400).json({
        success: false,
        message: "A case study with this title already exists",
      });
    }

    const caseStudy = new CaseStudy({
      title,
      slug,
      subtitle,
      imageUrl: finalImageUrl,
      youtubeUrl,
      overview: JSON.parse(overview || "{}"),
      highlight: JSON.parse(highlight || "{}"),
      challenge: JSON.parse(challenge || "{}"),
      solution: JSON.parse(solution || "{}"),
      quote: JSON.parse(quote || "{}"),
      results: JSON.parse(results || "{}"),
      status: ECaseStudyStatus.DRAFT,
    });

    await caseStudy.save();

    res.status(201).json({
      success: true,
      message: "Case study created successfully",
      data: caseStudy,
    });
  } catch (error) {
    console.error("Error creating case study:", error);
    res.status(500).json({
      success: false,
      message: "Error creating case study",
    });
  }
};

// Get all case studies (public)
export const getCaseStudies = async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limitParam = req.query.limit as string;
    const limit = limitParam ? parseInt(limitParam) : undefined;

    const query: any = {};

    // Filter by status (public should only see published)
    if (status) {
      query.status = status;
    } else {
      query.status = ECaseStudyStatus.PUBLISHED;
    }

    // Search in title and subtitle
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { subtitle: { $regex: search, $options: "i" } },
      ];
    }

    let queryBuilder = CaseStudy.find(query);

    if (limit) {
      const skip = (page - 1) * limit;
      queryBuilder = queryBuilder.skip(skip).limit(limit);
    }

    const caseStudies = await queryBuilder.exec();
    const total = await CaseStudy.countDocuments(query);

    res.json({
      success: true,
      data: caseStudies,
      pagination: limit ? {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      } : undefined,
    });
  } catch (error) {
    console.error("Error getting case studies:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching case studies",
    });
  }
};

// Get case study by slug
export const getCaseStudyBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const caseStudy = await CaseStudy.findOne({ 
      slug,
      status: ECaseStudyStatus.PUBLISHED 
    });

    if (!caseStudy) {
      return res.status(404).json({
        success: false,
        message: "Case study not found",
      });
    }

    res.json({
      success: true,
      data: caseStudy,
    });
  } catch (error) {
    console.error("Error getting case study:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching case study",
    });
  }
};

// Get case study by ID (admin)
export const getCaseStudyByIdForAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const caseStudy = await CaseStudy.findById(id);

    if (!caseStudy) {
      return res.status(404).json({
        success: false,
        message: "Case study not found",
      });
    }

    res.json({
      success: true,
      data: caseStudy,
    });
  } catch (error) {
    console.error("Error getting case study:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching case study",
    });
  }
};

// Get all case studies for admin
export const getAllCaseStudiesForAdmin = async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limitParam = req.query.limit as string;
    const limit = limitParam ? parseInt(limitParam) : 10;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { subtitle: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const caseStudies = await CaseStudy.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await CaseStudy.countDocuments(query);

    res.json({
      success: true,
      data: caseStudies,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting case studies:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching case studies",
    });
  }
};

// Update case study
export const updateCaseStudy = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const {
      title,
      subtitle,
      imageUrl,
      youtubeUrl,
      overview,
      highlight,
      challenge,
      solution,
      quote,
      results,
      status,
    } = req.body;

    const caseStudy = await CaseStudy.findById(id);

    if (!caseStudy) {
      return res.status(404).json({
        success: false,
        message: "Case study not found",
      });
    }

    // Handle uploaded file
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let finalImageUrl = imageUrl || caseStudy.imageUrl;
    
    if (files.image && files.image[0]) {
      finalImageUrl = files.image[0].path;
    }

    // Generate new slug if title changed
    let newSlug = caseStudy.slug;
    if (title && title !== caseStudy.title) {
      newSlug = title
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, "-");

      // Check if new slug exists (excluding current document)
      const existingCaseStudy = await CaseStudy.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });

      if (existingCaseStudy) {
        return res.status(400).json({
          success: false,
          message: "A case study with this title already exists",
        });
      }
    }

    // Update fields
    caseStudy.title = title || caseStudy.title;
    caseStudy.slug = newSlug;
    caseStudy.subtitle = subtitle || caseStudy.subtitle;
    caseStudy.imageUrl = finalImageUrl;
    caseStudy.youtubeUrl = youtubeUrl !== undefined ? youtubeUrl : caseStudy.youtubeUrl;
    
    if (overview) caseStudy.overview = JSON.parse(overview);
    if (highlight) caseStudy.highlight = JSON.parse(highlight);
    if (challenge) caseStudy.challenge = JSON.parse(challenge);
    if (solution) caseStudy.solution = JSON.parse(solution);
    if (quote) caseStudy.quote = JSON.parse(quote);
    if (results) caseStudy.results = JSON.parse(results);
    
    if (status && Object.values(ECaseStudyStatus).includes(status)) {
      caseStudy.status = status;
    }

    await caseStudy.save();

    res.json({
      success: true,
      message: "Case study updated successfully",
      data: caseStudy,
    });
  } catch (error) {
    console.error("Error updating case study:", error);
    res.status(500).json({
      success: false,
      message: "Error updating case study",
    });
  }
};

// Toggle case study status
export const toggleCaseStudyStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(ECaseStudyStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const caseStudy = await CaseStudy.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!caseStudy) {
      return res.status(404).json({
        success: false,
        message: "Case study not found",
      });
    }

    res.json({
      success: true,
      message: "Case study status updated successfully",
      data: caseStudy,
    });
  } catch (error) {
    console.error("Error toggling case study status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating case study status",
    });
  }
};

// Get case study stats
export const getCaseStudyStats = async (req: Request, res: Response) => {
  try {
    const total = await CaseStudy.countDocuments();
    const published = await CaseStudy.countDocuments({
      status: ECaseStudyStatus.PUBLISHED,
    });
    const draft = await CaseStudy.countDocuments({
      status: ECaseStudyStatus.DRAFT,
    });
    const archived = await CaseStudy.countDocuments({
      status: ECaseStudyStatus.ARCHIVED,
    });

    res.json({
      success: true,
      data: {
        total,
        published,
        draft,
        archived,
      },
    });
  } catch (error) {
    console.error("Error getting case study stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
    });
  }
};

// Delete case study
export const deleteCaseStudy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const caseStudy = await CaseStudy.findByIdAndDelete(id);

    if (!caseStudy) {
      return res.status(404).json({
        success: false,
        message: "Case study not found",
      });
    }

    res.json({
      success: true,
      message: "Case study deleted successfully",
      data: caseStudy,
    });
  } catch (error) {
    console.error("Error deleting case study:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting case study",
    });
  }
};
