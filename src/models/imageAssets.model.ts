import { Document, model, Schema } from "mongoose";

export interface IImageAsset extends Document {
    name: string;
    url: string;
    altText: string;
    publicId: string; // Store Cloudinary public ID
    createdAt: Date;
    updatedAt: Date;
}

const ImageAssetSchema = new Schema<IImageAsset>({
    name: {
        type: String,
        required: true,
    },
    url: {
        type: String,
        required: true,
    },
    altText: {
        type: String,
        required: true,
    },
    publicId: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

export default model<IImageAsset>("ImageAsset", ImageAssetSchema);