import { ObjectId, Document } from "mongodb";
import { model, Schema } from "mongoose";
import { BlogCategories } from "@/types/blogCategories";

export interface IBlog extends Document {
  _id: ObjectId;
  title: string;
  subtitle?: string;
  description: string;
  slug: string;
  contentUrl: string; // Cloudinary URL
  thumbnailUrl?: string; // Optional thumbnail image URL
  creator: ObjectId;
  views: number;
  category: string; // Should be one of BlogCategories
  datePublished?: Date;
  tableOfContents?: string[]; // Array of section titles
  tags?: string[];
  readTime?: number; // Estimated reading time in minutes
  status: EBlogStatus;
  ctaSection?: {
    title: string;
    content: string;
  },
  authorName: string;
  readMore?: {
    title: string;
    content: string;
    link: string;
  }
  faqs?: {
    _id?: ObjectId;
    question: string;
    answer: string;
    order?: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export enum EBlogStatus {
  DRAFT = "Draft",
  PUBLISHED = "Published",
  ARCHIVED = "Archived"
}

const BlogSchema = new Schema<IBlog>({
  title: {
    type: String,
    required: true,
    unique: true,
  },
  subtitle: {
    type: String,
  },
  description: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  contentUrl: {
    type: String,
    required: true,
  },
  thumbnailUrl: {
    type: String,
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  views: {
    type: Number,
    default: 0,
  },
  category: {
    type: String,
    enum: BlogCategories,
    required: true,
  },
  datePublished: {
    type: Date,
  },
  authorName: {
    type: String,
    required: true,
  },
  tableOfContents: [{
    type: String,
  }],
  tags: [{
    type: String,
  }],
  readTime: {
    type: Number,
  },
  status: {
    type: String,
    enum: EBlogStatus,
    default: EBlogStatus.DRAFT,
  },
  ctaSection: {
    title: {
      type: String,
    },
    content: {
      type: String,
    },
  },
  readMore: {
    title: {
      type: String,
    },
    content: {
      type: String,
    },
    link: {
      type: String,
    },
  },
  faqs: [{
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  }],
}, {
  timestamps: true,
})


export default model<IBlog>("Blog", BlogSchema);
