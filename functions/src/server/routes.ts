import express from "express";
import { 
  registerUser, 
  loginUser, 
  authenticateToken 
} from "./auth.js";

export function createApiRoutes() {
  const router = express.Router();

  // Authentication Routes
  router.post("/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const user = await registerUser(email, password, firstName, lastName, role);
      res.status(201).json({ message: "User created successfully", user });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.message === "User with this email already exists") {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });

  router.post("/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const { user, token } = await loginUser(email, password);

      // Set token as httpOnly cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({ message: "Login successful", user });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(401).json({ message: error.message || "Invalid credentials" });
    }
  });

  router.post("/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logout successful" });
  });

  router.get("/auth/me", authenticateToken, (req: any, res) => {
    res.json({ user: req.user });
  });

  // Health check
  router.get("/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      service: "firebase-functions" 
    });
  });

  return router;
}