import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import apiRouter from "@/api.router";
import { errorHandler } from "@/middleware/errorHandler.middleware";

const app = express();

// Configure middleware stack - order matters
app.use(express.json()); // Parse JSON request bodies
app.use(cookieParser()); // Parse cookies from request headers
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000", // Allow requests only from configured client
    credentials: true, // Enable cookies and authorization headers
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"],
    maxAge: 86400 // CORS preflight cache time (24 hour)
  })
);

// Mount API routes under /api prefix
app.use("/api", apiRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.send("Rapidsio API is running...");
});
const dbString = process.env.MONGODB_URI;
const nodeEnv = process.env.NODE_ENV + " Environment" || "Environment not found";

app.get('/dbString', (req, res) => {
  res.status(200).json({ message: `${nodeEnv} with MongoURL ${dbString}` });
});

// Catch-all handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handling middleware
app.use(errorHandler);

export default app;