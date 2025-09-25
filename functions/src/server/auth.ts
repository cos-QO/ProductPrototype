import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import { db } from "./db.js";
import { users } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

// JWT configuration
const JWT_SECRET =
  process.env.JWT_SECRET || "development-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";

// Argon2id configuration (most secure option)
const hashingConfig = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16, // 64MB
  timeCost: 3,
  parallelism: 1,
};

// Hash password using Argon2id
export async function hashPassword(password: string): Promise<string> {
  try {
    return await argon2.hash(password, hashingConfig);
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Failed to hash password");
  }
}

// Verify password
export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, password);
  } catch (error) {
    console.error("Error verifying password:", error);
    return false;
  }
}

// Generate JWT token
export function generateToken(userId: string): string {
  return jwt.sign(
    {
      userId,
      iat: Date.now(),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

// Verify JWT token
export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

// Register new user
export async function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: "brand_owner" | "retailer" | "content_team" = "retailer",
) {
  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser && existingUser.length > 0) {
      throw new Error("User with this email already exists");
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Create new user
    const newUser = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        firstName,
        lastName,
        role,
      })
      .returning();

    if (!newUser || newUser.length === 0) {
      throw new Error("Failed to create user");
    }

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = newUser[0];
    return userWithoutPassword;
  } catch (error: any) {
    console.error("Error registering user:", error);
    throw error;
  }
}

// Login user
export async function loginUser(email: string, password: string) {
  try {
    // Find user by email
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || user.length === 0) {
      throw new Error("Invalid email or password");
    }

    const userRecord = user[0];

    // Check if user has a password (might be OAuth user)
    if (!userRecord.passwordHash) {
      throw new Error("Please login with Google");
    }

    // Verify password
    const isValid = await verifyPassword(userRecord.passwordHash, password);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    // Generate token
    const token = generateToken(userRecord.id);

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = userRecord;
    return {
      user: userWithoutPassword,
      token,
    };
  } catch (error: any) {
    console.error("Error logging in user:", error);
    throw error;
  }
}

// Initialize auth middleware for Firebase Functions
export async function initializeAuth(app: any) {
  // Firebase Functions don't need session setup
  console.log("Auth initialized for Firebase Functions");
}

// Middleware to protect routes
export async function authenticateToken(
  req: Request & { user?: any },
  res: Response,
  next: NextFunction,
) {
  try {
    // In development mode with mock auth, bypass
    if (
      process.env.NODE_ENV === "development" &&
      process.env.DATABASE_URL?.includes("mock")
    ) {
      req.user = {
        id: "local-dev-user",
        email: "dev@localhost",
        firstName: "Local",
        lastName: "Developer",
        role: "brand_owner",
      };
      return next();
    }

    // Check for token in cookies or authorization header
    const token =
      req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Get user from database
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user || user.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    // Attach user to request (without password)
    const { passwordHash: _, ...userWithoutPassword } = user[0];
    req.user = userWithoutPassword;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({ message: "Authentication error" });
  }
}

// Middleware to check user role
export function requireRole(...roles: string[]) {
  return (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}
