import { Response, Request, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { EUserRole } from "@/models/user.model";
import { ObjectId } from "mongodb";

interface DecodedToken {
  id: string;
  role: EUserRole;
  email: string;
  fingerprint: {
    userAgent: string;
    ip: string;
  };
  version: number;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user: {
    _id: ObjectId;
    name: string;
    email: string;
    role: EUserRole;
    verified: boolean;
    createdAt: Date;
    updatedAt: Date;  
  };
}

export const validateUserAccess = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from cookie or header
    let token =
      req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    ) as DecodedToken;

    // Fetch the user from database to get the complete user object
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user is verified
    if (!user.verified) {
      return res.status(403).json({ error: "User not verified" });
    }

    // Attach user to request object
    req.user = user;

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }

    res.status(400).json({ error: "Invalid token" });
  }
};

export const validateAdminAccess = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from cookie or header
    let token =
      req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    ) as DecodedToken;

    // Fetch the user from database to get the complete user object
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user has admin role
    if (user.role !== EUserRole.ADMIN && user.role !== EUserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Attach user to request object
    req.user = user;

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    res.status(400).json({ error: "Invalid token" });
  }
};

export const validateSuperAdminAccess = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from cookie or header
    let token =
      req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    ) as DecodedToken;

    // Fetch the user from database to get the complete user object
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user has super admin role
    if (user.role !== EUserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Super admin access required" });
    }

    // Attach user to request object
    req.user = user;

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    res.status(400).json({ error: "Invalid token" });
  }
};
