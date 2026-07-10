import { Request, Response } from "express";
import User, { EUserRole } from "@/models/user.model";

interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
  role?: string;
  verified?: string;
  sortBy?: string;
  sortOrder?: string;
}

export const getAllUsers = async (req: any, res: Response): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search = "",
      role,
      verified,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query as PaginationQuery;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    if (role && Object.values(EUserRole).includes(role as EUserRole)) {
      filter.role = role;
    }

    if (verified !== undefined) {
      filter.verified = verified === "true";
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Get users with pagination
    const users = await User.find(filter)
      .select("-password")
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limitNum);

    // Get role distribution
    const roleStats = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);

    const verificationStats = await User.aggregate([
      { $group: { _id: "$verified", count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalUsers,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
          limit: limitNum
        },
        stats: {
          roleDistribution: roleStats,
          verificationStats: verificationStats
        }
      },
      message: "Users retrieved successfully"
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message
    });
  }
};

export const verifyUser = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { verified } = req.body;

    if (typeof verified !== "boolean") {
      res.status(400).json({
        success: false,
        message: "Verified status must be a boolean"
      });
      return;
    }

    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    // Prevent super admin from being unverifying themselves
    if (user.role === EUserRole.SUPER_ADMIN && !verified && req.user.id === id) {
      res.status(400).json({
        success: false,
        message: "Cannot unverify yourself as super admin"
      });
      return;
    }

    user.verified = verified;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          verified: user.verified,
          role: user.role
        }
      },
      message: `User ${verified ? 'verified' : 'unverified'} successfully`
    });
  } catch (error: any) {
    console.error("Error updating user verification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user verification",
      error: error.message
    });
  }
};

export const changeUserRole = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(EUserRole).includes(role as EUserRole)) {
      res.status(400).json({
        success: false,
        message: "Invalid role provided",
        validRoles: Object.values(EUserRole)
      });
      return;
    }

    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    // Prevent the last super admin from being demoted
    if (user.role === EUserRole.SUPER_ADMIN && role !== EUserRole.SUPER_ADMIN) {
      const superAdminCount = await User.countDocuments({ role: EUserRole.SUPER_ADMIN });
      if (superAdminCount <= 1) {
        res.status(400).json({
          success: false,
          message: "Cannot demote the last super admin"
        });
        return;
      }
    }

    // Prevent user from demoting themselves
    if (req.user.id === id && req.user.role === EUserRole.SUPER_ADMIN && role !== EUserRole.SUPER_ADMIN) {
      res.status(400).json({
        success: false,
        message: "Cannot demote yourself from super admin"
      });
      return;
    }

    const oldRole = user.role;
    user.role = role as EUserRole;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          verified: user.verified,
          role: user.role
        },
        changes: {
          oldRole,
          newRole: user.role
        }
      },
      message: `User role changed from ${oldRole} to ${user.role} successfully`
    });
  } catch (error: any) {
    console.error("Error changing user role:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change user role",
      error: error.message
    });
  }
};

export const getUserById = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { user },
      message: "User retrieved successfully"
    });
  } catch (error: any) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message
    });
  }
};