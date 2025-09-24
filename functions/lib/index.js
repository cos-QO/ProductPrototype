import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
// Import your existing server modules
import { initializeAuth } from "./server/auth.js";
import { createApiRoutes } from "./server/routes.js";
import { initializeDatabase } from "./server/db.js";
const app = express();
// CORS configuration for Firebase hosting
app.use(cors({
    origin: [
        "https://skustore.web.app",
        "https://skustore.firebaseapp.com",
        "http://localhost:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
}));
// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Firebase hosting handles this
    crossOriginEmbedderPolicy: false,
}));
// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);
// Parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
// Initialize database and auth
let dbInitialized = false;
async function ensureInitialized() {
    if (!dbInitialized) {
        await initializeDatabase();
        await initializeAuth(app);
        dbInitialized = true;
    }
}
// API routes
app.use("/api", async (req, res, next) => {
    await ensureInitialized();
    next();
}, createApiRoutes());
// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// 404 handler
app.use("*", (req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
});
// Error handler
app.use((error, req, res, next) => {
    console.error("API Error:", error);
    res.status(500).json({
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
});
// Export the Firebase Function
export const api = onRequest({
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 540,
    maxInstances: 10,
}, app);
//# sourceMappingURL=index.js.map