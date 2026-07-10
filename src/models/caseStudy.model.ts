import { ObjectId, Document } from "mongodb";
import { model, Schema } from "mongoose";

export interface ICaseStudy extends Document {
    _id: ObjectId;
    title: string;
    slug: string;
    subtitle: string;
    imageUrl: string; // cloudinary URL
    youtubeUrl?: string;
    overview: {
        content: string;
        features: {
            icon: string;
            title: string;
        }[];
    };
    highlight: {
        content: string[];
    };
    challenge: {
        subtitle: string;
        content: string[];
    };
    solution: {
        subtitle: string;
        content: string[];
    };
    quote: {
        text: string;
        by: string;
        position: string;
    };
    results: {
        subtitle: string;
        content: string[];
    };
    status: ECaseStudyStatus;
    createdAt: Date;
    updatedAt: Date;
}

export enum ECaseStudyStatus {
    DRAFT = "Draft",
    PUBLISHED = "Published",
    ARCHIVED = "Archived",
}

const CaseStudySchema = new Schema<ICaseStudy>(
    {
        title: {
            type: String,
            required: true,
            unique: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
        },
        subtitle: {
            type: String,
            required: true,
        },
        imageUrl: {
            type: String,
            required: true,
        },
        youtubeUrl: {
            type: String,
            optional: true,
        },
        overview: {
            content: {
                type: String,
                required: true,
            },
            features: [
                {
                    icon: {
                        type: String,
                        required: true,
                    },
                    title: {
                        type: String,
                        required: true,
                    },
                },
            ],
        },
        highlight: {
            content: [
                {
                    type: String,
                    required: true,
                },
            ],
        },
        challenge: {
            subtitle: {
                type: String,
                required: true,
            },
            content: [
                {
                    type: String,
                    required: true,
                },
            ],
        },
        solution: {
            subtitle: {
                type: String,
                required: true,
            },
            content: [
                {
                    type: String,
                    required: true,
                },
            ],
        },
        quote: {
            text: {
                type: String,
                required: true,
            },
            by: {
                type: String,
                required: true,
            },
            position: {
                type: String,
                required: true,
            },
        },
        results: {
            subtitle: {
                type: String,
                required: true,
            },
            content: [
                {
                    type: String,
                    required: true,
                },
            ],
        },
        status: {
            type: String,
            enum: Object.values(ECaseStudyStatus),
            default: ECaseStudyStatus.DRAFT,
        },
    },
    {
        timestamps: true,
    }
);

export const CaseStudy = model<ICaseStudy>("CaseStudy", CaseStudySchema);