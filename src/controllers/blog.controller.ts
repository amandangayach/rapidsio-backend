import { Request, Response } from "express";
import { validationResult } from "express-validator";
import Blog, { EBlogStatus, IBlog } from "@/models/blog.model";
import { cloudinaryUtils, upload } from "@/utils/cloudinary.utils";
import { v2 as cloudinary } from 'cloudinary';

// Create new blog
export const createBlog = async (req: Request, res: Response) => {
  try {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { title, subtitle, description, content, tags, authorName, tableOfContents, ctaSection, readMore, views, category, faqs } = req.body;
    const creator = (req as any).user._id;

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "-");
    console.log('Generated slug:', slug);

    // Check if slug already exists
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      return res.status(400).json({
        success: false,
        message: "A blog with this title already exists",
      });
    }

    // Handle content upload to Cloudinary
    let contentUrl: string | undefined;
    if (content) {
      if (content.startsWith('http')) {
        contentUrl = content;
      } else {
        const publicId = `convert-spaces/content/blogs/${slug}-content.md`;
        try {
          const uploadResult = await cloudinary.uploader.upload(`data:text/markdown;base64,${Buffer.from(content).toString('base64')}`, {
            resource_type: 'raw',
            public_id: publicId,
            overwrite: true,
            invalidate: true,
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

    // Handle optional thumbnail upload
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const thumbnailFile = files?.thumbnail?.[0];
    const thumbnailUrl = thumbnailFile ? thumbnailFile.path : undefined;

    // Calculate estimated reading time (rough estimate)
    const words = content.split(/\s+/).length;
    const readTime = Math.ceil(words / 200); // Assuming 200 words per minute

    const blog = new Blog({
      title,
      subtitle,
      description,
      slug,
      content,
      contentUrl,
      thumbnailUrl,
      creator,
      authorName: authorName || (req as any).user.name,
      tags,
      category,
      readTime,
      tableOfContents: tableOfContents ? JSON.parse(tableOfContents) : undefined,
      ctaSection: ctaSection ? (() => {
        const parsed = JSON.parse(ctaSection);
        return (parsed.title && parsed.content) ? parsed : undefined;
      })() : undefined,
      readMore: readMore ? JSON.parse(readMore) : undefined,
      faqs: faqs ? JSON.parse(faqs) : undefined,
      status: EBlogStatus.DRAFT,
      views: views ? parseInt(views) : 0,
    });

    await blog.save();

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Error creating blog:", error);
    res.status(500).json({
      success: false,
      message: "Error creating blog",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Get all blogs (with pagination and filters)
export const getBlogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as EBlogStatus;
    const tag = req.query.tag as string;
    const category = req.query.category as string;
    const search = req.query.search as string;

    // Build query
    const query: any = {};
    
    // Status filter (for admins, show all. for others, show only published)
    const user = (req as any).user;
    if (user?.role === "Admin" || user?.role === "Super_Admin") {
      if (status) query.status = status;
    } else {
      query.status = EBlogStatus.PUBLISHED;
    }

    // Tag filter
    if (tag) query.tags = tag;

    // Category filter
    if (category) query.category = category;

    // Search in title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Execute query with pagination
    const blogs = await Blog.find(query)
      .populate("creator", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Get total count for pagination
    const total = await Blog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        blogs,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalItems: total,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching blogs",
    });
  }
};

// Get single blog by slug
export const getBlogBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const blog = await Blog.findOne({ slug }).populate("creator", "name email");

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    if(blog.status !== EBlogStatus.PUBLISHED) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this blog",
      });
    }

    // Increment views
    blog.views = (blog.views || 0) + 1;
    await blog.save();

    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching blog",
    });
  }
};

// Get single blog by ID (Admin only - can fetch any status)
export const getBlogByIdForAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id).populate("creator", "name email");

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching blog",
    });
  }
};

// Update blog
export const updateBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, subtitle, description, content, tags, status, authorName, tableOfContents, ctaSection, readMore, views, category, faqs } = req.body;

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Check permissions
    const user = (req as any).user;
    if (!user || !user._id || !blog.creator) {
      return res.status(403).json({
        success: false,
        message: "Invalid user or blog data",
      });
    }
    
    if (user._id.toString() !== blog.creator.toString() && 
        user.role !== "Admin" && 
        user.role !== "Super_Admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this blog",
      });
    }

    // If title changed, update slug
    if (title && title !== blog.title) {
      const newSlug = title
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, "-");

      // Check if new slug already exists
      const existingBlog = await Blog.findOne({ 
        slug: newSlug, 
        _id: { $ne: id } 
      });
      
      if (existingBlog) {
        return res.status(400).json({
          success: false,
          message: "A blog with this title already exists",
        });
      }

      blog.slug = newSlug;
    }

    // Process content - either upload new content or keep existing URL
    console.log('=== CONTENT UPDATE DEBUG ===');
    console.log('Incoming content:', content ? content.substring(0, 100) + '...' : 'undefined');
    console.log('Existing contentUrl:', blog.contentUrl);
    console.log('Content starts with http:', content ? content.startsWith('http') : 'N/A');

    let contentUrl = blog.contentUrl; // Start with existing URL

    // If content has changed and is not a URL (actual markdown content)
    if (content !== undefined && content !== blog.contentUrl && !content.startsWith('http')) {
      console.log('Content has changed, uploading to Cloudinary...');
      // Upload new markdown content to Cloudinary (overwrite existing file at same public_id)
      const publicId = `convert-spaces/content/blogs/${blog.slug}-content.md`;
      console.log('Using publicId:', publicId);
      try {
        const uploadResult = await cloudinary.uploader.upload(`data:text/markdown;base64,${Buffer.from(content).toString('base64')}`, {
          resource_type: 'raw',
          public_id: publicId,
          overwrite: true,
          invalidate: true,
        });
        contentUrl = uploadResult.secure_url;
        console.log('New contentUrl:', contentUrl);
        // No separate delete needed — overwrite: true replaces the existing file at the same public_id
      } catch (error) {
        console.error('Error uploading content to Cloudinary:', error);
        return res.status(500).json({
          success: false,
          message: "Error uploading content",
        });
      }
    } else {
      console.log('Content unchanged or is already a URL, keeping existing contentUrl');
    }

    // Update contentUrl if it changed
    if (contentUrl !== blog.contentUrl) {
      console.log('Updating contentUrl from', blog.contentUrl, 'to', contentUrl);
      blog.contentUrl = contentUrl;
    } else {
      console.log('contentUrl unchanged');
    }

    // Handle thumbnail update
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const thumbnailFile = files?.thumbnail?.[0];
    if (thumbnailFile) {
      // Delete old thumbnail if exists
      if (blog.thumbnailUrl) {
        const oldThumbnailPublicId = cloudinaryUtils.getPublicIdFromUrl(blog.thumbnailUrl);
        await cloudinaryUtils.deleteFile(oldThumbnailPublicId);
      }
      blog.thumbnailUrl = thumbnailFile.path;
    }

    // Update fields
    blog.title = title || blog.title;
    blog.subtitle = subtitle || blog.subtitle;
    blog.description = description || blog.description;
    blog.tags = tags || blog.tags;
    blog.category = category || blog.category;
    blog.authorName = authorName || blog.authorName || user.name;
    if (views !== undefined) {
      blog.views = parseInt(views) || 0;
    }
    
    // Update nested objects
    if (tableOfContents !== undefined) {
      blog.tableOfContents = typeof tableOfContents === 'string' ? JSON.parse(tableOfContents) : tableOfContents;
    }
    if (ctaSection !== undefined) {
      const parsedCtaSection = typeof ctaSection === 'string' ? JSON.parse(ctaSection) : ctaSection;
      // Only set ctaSection if it has valid title and content
      if (parsedCtaSection && parsedCtaSection.title && parsedCtaSection.content) {
        blog.ctaSection = parsedCtaSection;
      } else if (parsedCtaSection && (!parsedCtaSection.title || !parsedCtaSection.content)) {
        // If ctaSection exists but has empty fields, remove it
        blog.ctaSection = undefined;
      }
    }
    if (readMore !== undefined) {
      blog.readMore = typeof readMore === 'string' ? JSON.parse(readMore) : readMore;
    }
    if (faqs !== undefined) {
      blog.faqs = typeof faqs === 'string' ? JSON.parse(faqs) : faqs;
    }
    
    // Only admins can change status
    if (status && (user.role === "Admin" || user.role === "Super_Admin")) {
      blog.status = status;
      // Set datePublished when published for the first time
      if (status === EBlogStatus.PUBLISHED && !blog.datePublished) {
        blog.datePublished = new Date();
      }
    }

    // Update reading time if content changed
    if (content) {
      const words = content.split(/\s+/).length;
      blog.readTime = Math.ceil(words / 200);
    }

    await blog.save();

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Error updating blog:", error);
    res.status(500).json({
      success: false,
      message: "Error updating blog",
    });
  }
};

// Archive blog (Admin only)
export const archiveBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    blog.status = EBlogStatus.ARCHIVED;
    await blog.save();

    res.status(200).json({
      success: true,
      message: "Blog archived successfully",
    });
  } catch (error) {
    console.error("Error archiving blog:", error);
    res.status(500).json({
      success: false,
      message: "Error archiving blog",
    });
  }
};

// Toggle blog status between Draft and Published (Admin only)
export const toggleBlogStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First, find the blog to check its current status
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Only allow toggling between Draft and Published, not Archived
    if (blog.status === EBlogStatus.ARCHIVED) {
      return res.status(400).json({
        success: false,
        message: "Cannot toggle status of archived blog",
      });
    }

    // Toggle between Draft and Published
    const newStatus = blog.status === EBlogStatus.PUBLISHED
      ? EBlogStatus.DRAFT
      : EBlogStatus.PUBLISHED;

    // Use findByIdAndUpdate to avoid validation issues
    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      { status: newStatus },
      {
        new: true,
        runValidators: false, // Skip validation since we're only updating status
        select: '_id status' // Only select the fields we need
      }
    );

    if (!updatedBlog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Blog status toggled successfully",
      data: {
        _id: updatedBlog._id,
        status: updatedBlog.status,
      },
    });
  } catch (error) {
    console.error("Error toggling blog status:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling blog status",
    });
  }
};

// Delete blog (Super Admin only)
export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Delete content from Cloudinary
    if (blog.contentUrl) {
      const publicId = cloudinaryUtils.getPublicIdFromUrl(blog.contentUrl);
      await cloudinaryUtils.deleteFile(publicId, "raw");
    }

    // Delete thumbnail if exists
    if (blog.thumbnailUrl) {
      const publicId = cloudinaryUtils.getPublicIdFromUrl(blog.thumbnailUrl);
      await cloudinaryUtils.deleteFile(publicId);
    }

    await blog.deleteOne();

    res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting blog",
    });
  }
};

// Get blog stats (Admin only)
export const getBlogStats = async (req: Request, res: Response) => {
  try {
    const stats = await Blog.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const tagStats = await Blog.aggregate([
      { $unwind: "$tags" },
      {
        $group: {
          _id: "$tags",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const categoryStats = await Blog.aggregate([
      {
        $group: {
          _id: "$category",
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
        popularTags: tagStats,
        popularCategories: categoryStats,
      },
    });
  } catch (error) {
    console.error("Error getting blog stats:", error);
    res.status(500).json({
      success: false,
      message: "Error getting blog stats",
    });
  }
};

// Get all blogs for admin (no status filtering)
export const getAllBlogsForAdmin = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const tag = req.query.tag as string;
    const category = req.query.category as string;
    const search = req.query.search as string;

    // Build query - no status filtering for admins
    const query: any = {};

    // Tag filter
    if (tag) query.tags = tag;

    // Category filter
    if (category) query.category = category;

    // Search in title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Execute query with pagination
    const blogs = await Blog.find(query)
      .populate("creator", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Get total count for pagination
    const total = await Blog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        blogs,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalItems: total,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching all blogs for admin:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching blogs",
    });
  }
};
