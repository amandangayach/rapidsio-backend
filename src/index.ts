import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary } from 'cloudinary';
import app from "@/app";
import { disconnectFromDatabase, connectToDatabase } from "@/config/db.config";

// Configure Cloudinary after environment variables are loaded
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('Missing Cloudinary environment variables');
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('Cloudinary configured successfully');

const port = process.env.PORT || 8080;

// Start the server regardless of database connection
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

// Connect to MongoDB but don't crash if it fails
connectToDatabase()
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    console.log("Server running without database connection");
  });

// Handle unexpected errors
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Promise Rejection at:", promise, "reason:", reason);
});

process.on('SIGINT', async () => {
  console.log('Shutting down the app');
  disconnectFromDatabase();

  process.exit(0);
});