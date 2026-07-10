import { ObjectId, Document } from "mongodb";
import { model, Schema } from "mongoose";

export interface IFAQ extends Document {
  _id: ObjectId;
  question: string;
  answer: string;
  order: number;
}

const FAQSchema = new Schema<IFAQ>({
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
});

export interface ISample extends Document {
  _id: ObjectId;
  title: string;
  subtitle?: string;
  description: string;
  slug: string;
  contentUrl: string; // Cloudinary URL
  subject: string; // Subject from Subjects array
  topic?: string;
  academicLevel?: string;
  wordCount?: number;
  referenceCount?: number;
  faqs?: IFAQ[];
  status: ESampleStatus;
  rating?: {
    score: number;
    count: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export enum ESampleStatus {
  DRAFT = "Draft",
  PUBLISHED = "Published",
  ARCHIVED = "Archived"
}

const SampleSchema = new Schema<ISample>({
  title: {
    type: String,
    required: true,
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
  subject: {
    type: String, // Subject from Subjects array
    required: true,
    index: true,
  },
  topic: {
    type: String,
  },
  academicLevel: {
    type: String,
  },
  wordCount: {
    type: Number,
  },
  referenceCount: {
    type: Number,
  },
  faqs: [FAQSchema],
  status: {
    type: String,
    enum: ESampleStatus,
    default: ESampleStatus.DRAFT,
  },
}, {
  timestamps: true,
})

export default model<ISample>("Sample", SampleSchema);
