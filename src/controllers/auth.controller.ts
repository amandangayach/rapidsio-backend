import { Request, Response } from "express";
import User from "@/models/user.model";
import argon2 from "argon2";
import { sendTokenResponse } from "@/utils/jwt.utils";

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await argon2.hash(password);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      verified: false,
      role: "User",
    });

    await newUser.save();
    sendTokenResponse(newUser, 201, res, req);

  } catch (error) {
    res.status(500).json({ error: "Server error during registration" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const passwordMatch = await argon2.verify(user.password, password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    if (!user.verified) {
      return res.status(403).json({ error: "Email not verified" });
    }

    sendTokenResponse(user, 200, res, req);

  } catch (error) {
    res.status(500).json({ error: "Server error during login" });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

export const refreshToken = (req: any, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token provided' });
  }
}

export const getCurrentUser = async (req: any, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'No user found' });
  }

  const userData = await User.findById(user.id)
  .select('-password');

  res.status(200).json(userData);

}