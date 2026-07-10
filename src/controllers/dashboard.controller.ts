import { Request, Response } from "express";
import User, { EUserRole } from "@/models/user.model";
import Blog from "@/models/blog.model";
import Sample from "@/models/sample.model";
import { Service } from "@/models/service.model";
import { ObjectId } from "mongodb";

interface DashboardStats {
  totalUsers: number;
  totalBlogs: number;
  totalSamples: number;
  totalServices: number;
  recentUsers: any[];
  recentBlogs: any[];
  recentSamples: any[];
  userRoleDistribution: {
    admin: number;
    superAdmin: number;
    user: number;
  };
  contentStatus: {
    publishedBlogs: number;
    draftBlogs: number;
    activeSamples: number;
    inactiveSamples: number;
  };
  monthlyGrowth: {
    users: number;
    blogs: number;
    samples: number;
  };
}

export const getDashboardStats = async (
  req: any,
  res: Response
): Promise<void> => {
  try {
    // Get current user for role-based access
    const user = req.user;

    // Basic counts
    const totalUsers = await User.countDocuments();
    const totalBlogs = await Blog.countDocuments();
    const totalSamples = await Sample.countDocuments();
    const totalServices = await Service.countDocuments();

    // Recent users (last 5)
    const recentUsers = await User.find()
      .select("name email role createdAt verified")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Recent blogs (last 5)
    const recentBlogs = await Blog.find()
      .select("title slug status createdAt creator")
      .populate("creator", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Recent samples (last 5)
    const recentSamples = await Sample.find()
      .select("title slug status createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // User role distribution
    const userRoleDistribution = {
      admin: await User.countDocuments({ role: EUserRole.ADMIN }),
      superAdmin: await User.countDocuments({ role: EUserRole.SUPER_ADMIN }),
      user: await User.countDocuments({ role: EUserRole.USER }),
    };

    // Content status
    const publishedBlogs = await Blog.countDocuments({ status: "published" });
    const draftBlogs = await Blog.countDocuments({ status: "draft" });
    const activeSamples = await Sample.countDocuments({ status: "active" });
    const inactiveSamples = await Sample.countDocuments({ status: "inactive" });

    // Monthly growth (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyGrowth = {
      users: await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      blogs: await Blog.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      samples: await Sample.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    };

    const dashboardStats: DashboardStats = {
      totalUsers,
      totalBlogs,
      totalSamples,
      totalServices,
      recentUsers,
      recentBlogs,
      recentSamples,
      userRoleDistribution,
      contentStatus: {
        publishedBlogs,
        draftBlogs,
        activeSamples,
        inactiveSamples,
      },
      monthlyGrowth,
    };

    res.status(200).json({
      success: true,
      data: dashboardStats,
      message: "Dashboard statistics retrieved successfully",
    });
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error.message,
    });
  }
};

export const getAdminDashboardStats = async (
  req: any,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    // Check if user is admin or super admin
    if (user.role !== EUserRole.ADMIN && user.role !== EUserRole.SUPER_ADMIN) {
      res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
      return;
    }

    // Get all dashboard stats (same as regular but with admin-only data)
    await getDashboardStats(req, res);
  } catch (error: any) {
    console.error("Error fetching admin dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin dashboard statistics",
      error: error.message,
    });
  }
};

export const getSuperAdminDashboardStats = async (
  req: any,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    // Check if user is super admin
    if (user.role !== EUserRole.SUPER_ADMIN) {
      res.status(403).json({
        success: false,
        message: "Access denied. Super admin privileges required.",
      });
      return;
    }

    // Get all dashboard stats plus additional super admin data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const systemHealth = {
      totalStorageUsed: await getTotalStorageUsed(),
      averageResponseTime: await getAverageResponseTime(),
      errorRate: await getErrorRate(thirtyDaysAgo),
    };

    await getDashboardStats(req, res);

    // Add system health data to the response
    const originalJson = res.json;
    res.json = function(data: any) {
      if (data.success) {
        data.data.systemHealth = systemHealth;
      }
      return originalJson.call(this, data);
    };
  } catch (error: any) {
    console.error("Error fetching super admin dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch super admin dashboard statistics",
      error: error.message,
    });
  }
};

// Helper functions for super admin metrics
async function getTotalStorageUsed(): Promise<number> {
  // This would typically query your cloud storage provider
  // For now, return a placeholder
  return 0; // in MB
}

async function getAverageResponseTime(): Promise<number> {
  // This would typically query your monitoring system
  // For now, return a placeholder
  return 150; // in ms
}

async function getErrorRate(since: Date): Promise<number> {
  // This would typically query your error monitoring system
  // For now, return a placeholder
  return 0.02; // 2%
}