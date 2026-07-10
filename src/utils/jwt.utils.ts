import { Request, Response } from "express";
import { IUser } from "@/models/user.model";
import jwt from 'jsonwebtoken';

export const sendTokenResponse = (user: IUser, statusCode: number, res: Response, req: Request) => {
  // Get fingerprinting information
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Create a more secure token with additional claims
  const token = jwt.sign(
    { 
      id: user._id,
      name: user.name,
      email: user.email,
      fingerprint: {
        userAgent: userAgent.substring(0, 100), // Limit length for security
        ip: ipAddress
      },
      // Adding version number for future JWT structure changes
      version: 1
    },
    process.env.JWT_SECRET || 'your-secret-key',
    {
      expiresIn: '24h', // Longer expiry time to prevent frequent auth issues
    }
  );

  const cookieOptions = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    httpOnly: true,
    secure: true, // Required for SameSite=None
    sameSite: 'none' as const, // Allow cross-site cookies in both environments
    path: '/', // Ensure cookie is sent for all paths
  };

  // Set cookie and send response with fields that match our user model
  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
};