import { ObjectId, Document } from "mongodb";
import { model, Schema } from "mongoose";

export interface IUser extends Document {
  _id: ObjectId;
  name: string;
  email: string;
  verified: boolean;
  role: EUserRole;
  password: string;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum EUserRole {
  SUPER_ADMIN = "Super_Admin",
  USER = "User",
  ADMIN = "Admin",
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: EUserRole,
    default: EUserRole.USER,
  },
  password: {
    type: String,
    required: true,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
})

export default model<IUser>("User", UserSchema);
