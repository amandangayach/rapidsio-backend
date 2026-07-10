import { Document, model, Schema } from "mongoose";

export interface ITestimonial extends Document {
    name: string;
    content: string;
    stars: number;
    location?: string;
    imageUrl?: string;
    status?: "draft" | "published" | "archived";
    forHomepage: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const TestimonialSchema = new Schema<ITestimonial>({
    name: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    stars: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    location: {
        type: String,
        required: false,
        default: null,
    },
    imageUrl: {
        type: String,
        required: false,
        default: null,
    },
    status: {
        type: String,
        enum: ["draft", "published", "archived"],
        default: "draft",
        required: true,
    },
    forHomepage: {
        type: Boolean,
        default: false,
        required: true,
    },
}, {
    timestamps: true,
});

export default model<ITestimonial>("Testimonial", TestimonialSchema);