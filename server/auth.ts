import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

// JWT configuration with secure environment validation
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required for security");
  }
  if (secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }
  if (secret === "development-secret-change-in-production") {
    throw new Error(
      "JWT_SECRET cannot use the default development value in production",
    );
  }
  return secret;
})();
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

// Middleware to protect routes
export async function authenticateToken(
  req: Request & { user?: any },
  res: Response,
  next: NextFunction,
) {
  try {
    // SECURITY: Removed dangerous development mode bypass
    // All authentication must go through proper token validation

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

// Google OAuth preparation (structure for later implementation)
export const googleOAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  redirectUri:
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:5000/api/auth/google/callback",
  scope: ["openid", "email", "profile"],
};

// Placeholder for Google OAuth functions
export async function handleGoogleAuth(code: string) {
  // This will be implemented when you're ready
  // 1. Exchange code for tokens
  // 2. Get user info from Google
  // 3. Create or update user in database
  // 4. Generate JWT token
  throw new Error("Google OAuth not yet implemented");
}
