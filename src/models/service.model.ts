import { ObjectId, Document } from "mongodb";
import { model, Schema } from "mongoose";

export interface IService extends Document {
  _id: ObjectId;
  title: string;
  subtitle?: string;
  description: string;
  slug: string;
  order: number;
  status: EServiceStatus;
  featuresHeading: string;
  features: {
    icon: string;
    title: string;
    content: string;
  }[];
  about: {
    title: string;
    content: string;
    backgroundImage: string; // cloudinary URL
  };
  servicesHeading: string;
  services: {
    title: string;
    imageUrl: string; // cloudinary URL
    content: string;
  }[];
  processHeading: string;
  processDescription?: string;
  process: {
    title: string;
    content: string;
    imageUrl: string; // cloudinary URL
  }[];
  whyChooseUsHeading: string;
  whyChooseUsDescription?: string;
  whyChooseUs: {
    icon: string; // same as feature icon
    title: string;
    content: string;
  }[];
  areasHeading: string;
  areasDescription?: string;
  areas: {
    title: string;
    imageUrl: string; // cloudinary URL
  }[];
  faqsHeading?: string;
  faqsDescription?: string;
  faqs: {
    question: string;
    answer: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export enum EServiceStatus {
  DRAFT = "Draft",
  LIVE = "Live",
  INACTIVE = "Inactive",
  COMING_SOON = "Coming_Soon",
}

const ServiceSchema = new Schema<IService>(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    description: { type: String, required: true },
    slug: { type: String, required: true },
    order: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(EServiceStatus),
      required: true,
    },
    featuresHeading: { type: String, required: true },
    features: [
      {
        icon: { type: String, required: true },
        title: { type: String, required: true },
        content: { type: String, required: true },
      },
    ],
    about: {
      title: { type: String, required: true },
      content: { type: String, required: true },
      backgroundImage: { type: String, required: true },
    },
    servicesHeading: { type: String, required: true },
    services: [
      {
        title: { type: String, required: true },
        imageUrl: { type: String, required: true },
        content: { type: String, required: true },
      },
    ],
    processHeading: { type: String, required: true },
    processDescription: { type: String },
    process: [
      {
        title: { type: String, required: true },
        content: { type: String, required: true },
        imageUrl: { type: String, required: true },
      },
    ],
    whyChooseUsHeading: { type: String, required: true },
    whyChooseUsDescription: { type: String },
    whyChooseUs: [
      {
        icon: { type: String, required: true },
        title: { type: String, required: true },
        content: { type: String, required: true },
      },
    ],
    areasHeading: { type: String, required: true },
    areasDescription: { type: String },
    areas: [
      {
        title: { type: String, required: true },
        imageUrl: { type: String, required: true },
      },
    ],
    faqsHeading: { type: String },
    faqsDescription: { type: String },
    faqs: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
  },
);

export const Service = model<IService>("Service", ServiceSchema);
