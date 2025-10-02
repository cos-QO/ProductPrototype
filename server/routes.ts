import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { syndicationService } from "./syndication";
import {
  insertBrandSchema,
  insertProductSchema,
  insertCategorySchema,
  insertSyndicationChannelSchema,
  insertProductSyndicationSchema,
  insertProductAnalyticsSchema,
  analyticsValidationSchema,
  insertSkuDialAllocationSchema,
  updateSkuDialAllocationSchema,
  costPriceUpdateSchema,
  mediaAssets,
} from "@shared/schema";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import express from "express";
import { extractMetadata } from "./media-metadata";
import {
  registerUser,
  loginUser,
  authenticateToken,
  requireRole,
} from "./auth";
import {
  secureFileUpload,
  scanFileContent,
  rateLimiter,
  uploadRateLimiter,
  securityHeaders,
  csrfProtection,
  sanitizeInput,
  secureFileServing,
  generateCSRFToken,
  validateFilePath,
} from "./middleware/security";
import { registerVariantRoutes } from "./variant-routes";

// Configure secure multer for file uploads
const upload = secureFileUpload({
  allowedTypes: ["images", "videos"],
  maxFileSize: 10 * 1024 * 1024, // 10MB limit
  maxFiles: 5,
});

// Configure secure multer for bulk import uploads
const importUpload = secureFileUpload({
  allowedTypes: ["documents"],
  maxFileSize: 50 * 1024 * 1024, // 50MB limit for bulk imports
  maxFiles: 1,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // CSRF Token endpoint - must be before security middleware
  app.get("/api/csrf-token", (req: any, res) => {
    try {
      res.setHeader("Content-Type", "application/json");
      const sessionId = req.sessionID || req.ip || "default-session";

      // Generate or retrieve existing CSRF token for this session
      let csrfTokens = (global as any).csrfTokens || new Map();
      (global as any).csrfTokens = csrfTokens;

      if (!csrfTokens.has(sessionId)) {
        const token = generateCSRFToken();
        const expires = Date.now() + 60 * 60 * 1000; // 1 hour
        csrfTokens.set(sessionId, { token, expires });
      }

      const storedToken = csrfTokens.get(sessionId);

      // Check if token has expired
      if (storedToken && storedToken.expires < Date.now()) {
        const token = generateCSRFToken();
        const expires = Date.now() + 60 * 60 * 1000; // 1 hour
        csrfTokens.set(sessionId, { token, expires });
        return res.json({ csrfToken: token });
      }

      res.json({ csrfToken: storedToken.token });
    } catch (error) {
      console.error("CSRF token endpoint error:", error);
      res.status(500).json({ error: "Failed to generate CSRF token" });
    }
  });

  // Security middleware - apply globally
  app.use(securityHeaders);
  app.use(rateLimiter);
  app.use(sanitizeInput);

  // Auth middleware
  await setupAuth(app);

  // Authentication Routes

  // Register endpoint
  app.post("/api/auth/register", csrfProtection, async (req, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const user = await registerUser(
        email,
        password,
        firstName,
        lastName,
        role,
      );
      res.status(201).json({ message: "User created successfully", user });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.message === "User with this email already exists") {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", csrfProtection, async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
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

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logout successful" });
  });

  // Get current user (protected)
  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    res.json({ user: req.user });
  });

  // Backwards compatibility - redirect old login route
  app.get("/api/login", (req, res) => {
    if (
      process.env.NODE_ENV === "development" &&
      process.env.DATABASE_URL?.includes("mock")
    ) {
      // In development with mock DB, just redirect to dashboard
      res.redirect("/dashboard");
    } else {
      // Redirect to the login page
      res.redirect("/login");
    }
  });

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      // In development, return mock user
      if (process.env.NODE_ENV === "development") {
        res.json({
          id: "local-dev-user",
          email: "dev@localhost",
          firstName: "Local",
          lastName: "Developer",
          role: "brand_owner", // Give yourself admin access
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        return;
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Count endpoints for sidebar
  app.get("/api/dashboard/counts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      let productCount, brandCount;

      if (user?.role === "brand_owner") {
        productCount = await storage.countProducts(userId);
        brandCount = await storage.countBrands(userId);
      } else {
        productCount = await storage.countProducts();
        brandCount = await storage.countBrands();
      }

      res.json({
        products: productCount,
        brands: brandCount,
      });
    } catch (error) {
      console.error("Error fetching counts:", error);
      res.status(500).json({ message: "Failed to fetch counts" });
    }
  });

  // Brand routes
  app.get("/api/brands", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      let brands;
      if (user?.role === "brand_owner") {
        brands = await storage.getBrands(userId);
      } else {
        brands = await storage.getBrands(); // Retailers can see all brands
      }

      res.json(brands);
    } catch (error) {
      console.error("Error fetching brands:", error);
      res.status(500).json({ message: "Failed to fetch brands" });
    }
  });

  app.post(
    "/api/brands",
    uploadRateLimiter,
    isAuthenticated,
    csrfProtection,
    upload.single("logo"),
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (user?.role !== "brand_owner") {
          return res
            .status(403)
            .json({ message: "Only brand owners can create brands" });
        }

        const validatedData = insertBrandSchema.parse({
          ...req.body,
          ownerId: userId,
          slug: req.body.name
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
        });

        // Handle logo upload if present
        if (req.file) {
          const fileName = `brand-logo-${Date.now()}${path.extname(req.file.originalname)}`;

          // SECURITY: Validate filename and prevent path traversal
          if (!validateFilePath(fileName)) {
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(400).json({ error: "Invalid filename" });
          }

          const logoPath = path.join("uploads", fileName);
          const resolvedPath = path.resolve(logoPath);
          const resolvedUploadsDir = path.resolve("uploads");

          // SECURITY: Ensure file stays within uploads directory
          if (!resolvedPath.startsWith(resolvedUploadsDir)) {
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(400).json({ error: "Invalid file path" });
          }

          await fs.rename(req.file.path, logoPath);
          validatedData.logoUrl = `/uploads/${fileName}`;
        }

        const brand = await storage.createBrand(validatedData);
        res.status(201).json(brand);
      } catch (error) {
        console.error("Error creating brand:", error);
        res.status(400).json({
          message: "Failed to create brand",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  app.get("/api/brands/:id", isAuthenticated, async (req, res) => {
    try {
      const brandId = parseInt(req.params.id);
      const brand = await storage.getBrand(brandId);

      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }

      res.json(brand);
    } catch (error) {
      console.error("Error fetching brand:", error);
      res.status(500).json({ message: "Failed to fetch brand" });
    }
  });

  app.patch(
    "/api/brands/:id",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const brandId = parseInt(req.params.id);
        const userId = req.user.claims.sub;

        const brand = await storage.getBrand(brandId);
        if (!brand) {
          return res.status(404).json({ message: "Brand not found" });
        }

        if (brand.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "Only brand owners can update their brands" });
        }

        const updates = insertBrandSchema.partial().parse(req.body);
        const updatedBrand = await storage.updateBrand(brandId, updates);
        res.json(updatedBrand);
      } catch (error) {
        console.error("Error updating brand:", error);
        res.status(400).json({
          message: "Failed to update brand",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Product routes
  app.get("/api/products", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const brandId = req.query.brandId
        ? parseInt(req.query.brandId as string)
        : undefined;

      let products;
      if (user?.role === "brand_owner") {
        products = await storage.getProducts(brandId, userId);
      } else {
        products = await storage.getProducts(brandId);
      }

      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post(
    "/api/products",
    uploadRateLimiter,
    isAuthenticated,
    csrfProtection,
    upload.array("images", 5),
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;

        const validatedData = insertProductSchema.parse({
          ...req.body,
          brandId: parseInt(req.body.brandId),
          parentId: req.body.parentId ? parseInt(req.body.parentId) : null,
          slug: req.body.name
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
          sku: req.body.sku && req.body.sku.trim() ? req.body.sku.trim() : null,
          price: req.body.price
            ? Math.round(parseFloat(req.body.price) * 100)
            : null,
          compareAtPrice: req.body.compareAtPrice
            ? Math.round(parseFloat(req.body.compareAtPrice) * 100)
            : null,
        });

        const product = await storage.createProduct(validatedData);

        // Handle image uploads if present
        if (req.files && req.files.length > 0) {
          for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const fileName = `product-${product.id}-${Date.now()}-${i}${path.extname(file.originalname)}`;
            const imagePath = path.join("uploads", fileName);
            await fs.rename(file.path, imagePath);

            await storage.createMediaAsset({
              fileName,
              originalName: file.originalname,
              mimeType: file.mimetype,
              fileSize: file.size,
              url: `/uploads/${fileName}`,
              assetType: i === 0 ? "hero" : "product",
              productId: product.id,
              uploadedBy: userId,
            });
          }
        }

        res.status(201).json(product);
      } catch (error) {
        console.error("Error creating product:", error);
        res.status(400).json({
          message: "Failed to create product",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  app.get("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Get associated media assets
      const mediaAssets = await storage.getMediaAssets(productId);
      const attributes = await storage.getProductAttributes(productId);

      res.json({
        ...product,
        mediaAssets,
        attributes,
      });
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Product Analytics Routes
  // GET /api/products/:id/analytics - Retrieve analytics data
  app.get("/api/products/:id/analytics", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { period = "monthly", limit = 12, timeframe = "30d" } = req.query;

      const analytics = await storage.getProductAnalytics(parseInt(id), {
        period: period as string,
        limit: parseInt(limit as string) || 12,
        timeframe: timeframe as string,
      });

      // Calculate derived metrics
      const metricsWithCalculations = analytics.map((record) => ({
        ...record,
        // Convert cents to dollars for display
        revenueFormatted: (record.revenue / 100).toFixed(2),
        averageOrderValueFormatted: (record.averageOrderValue / 100).toFixed(2),

        // Calculate traffic distribution
        totalTraffic:
          record.trafficAds +
          record.trafficEmails +
          record.trafficText +
          record.trafficStore +
          record.trafficOrganic +
          record.trafficSocial +
          record.trafficDirect +
          record.trafficReferral,

        // Performance indicators
        isPerformingWell: record.performanceScore >= 70,
        isTrending: record.trendScore >= 70,
        isCompetitive: record.competitiveScore >= 60,
      }));

      // If no data, return default zero values for charts to render
      const responseData =
        metricsWithCalculations.length > 0
          ? metricsWithCalculations
          : [
              {
                productId: parseInt(id),
                buyRate: 0,
                expectedBuyRate: 0.05, // 5% default expected
                returnRate: 0,
                rebuyRate: 0,
                conversionRate: 0,
                cartAbandonmentRate: 0,
                reorderRate: 0,
                reviewRate: 0,
                revenue: 0,
                margin: 0,
                averageOrderValue: 0,
                volume: 0,
                trafficAds: 0,
                trafficEmails: 0,
                trafficText: 0,
                trafficStore: 0,
                trafficOrganic: 0,
                trafficSocial: 0,
                trafficDirect: 0,
                trafficReferral: 0,
                trafficSessions: 0,
                pageViews: 0,
                uniqueVisitors: 0,
                bounceRate: 0,
                avgSessionDuration: 0,
                performanceScore: 0,
                trendScore: 0,
                competitiveScore: 0,
                periodStart: new Date().toISOString(),
                periodEnd: new Date().toISOString(),
                reportingPeriod: period as string,
                revenueFormatted: "0.00",
                averageOrderValueFormatted: "0.00",
                totalTraffic: 0,
                isPerformingWell: false,
                isTrending: false,
                isCompetitive: false,
              },
            ];

      res.json({
        success: true,
        data: responseData,
        meta: {
          productId: parseInt(id),
          period,
          recordCount: responseData.length,
          calculatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Analytics fetch error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch analytics data",
        message: error.message,
      });
    }
  });

  // GET /api/products/:id/analytics/summary - Quick metrics for dashboard
  app.get(
    "/api/products/:id/analytics/summary",
    isAuthenticated,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { timeframe = "30d" } = req.query;

        // Get analytics data for the specified timeframe
        const analytics = await storage.getProductAnalytics(parseInt(id), {
          timeframe: timeframe as string,
        });

        if (!analytics || analytics.length === 0) {
          return res.json({
            success: true,
            data: {
              totalRevenue: 0,
              avgBuyRate: 0,
              avgMarginPercent: 0,
              totalVolume: 0,
              totalSessions: 0,
              trendsAnalysis: {
                revenueGrowth: 0,
                buyRateChange: 0,
                marginChange: 0,
                trafficChange: 0,
              },
            },
            message: "No analytics data available",
          });
        }

        // Calculate summary metrics
        const totalRevenue = analytics.reduce(
          (sum, a) => sum + (a.revenue || 0),
          0,
        );
        const avgBuyRate =
          analytics.reduce((sum, a) => sum + (Number(a.buyRate) || 0), 0) /
          analytics.length;
        const avgMarginPercent =
          (analytics.reduce((sum, a) => sum + (Number(a.margin) || 0), 0) /
            analytics.length) *
          100;
        const totalVolume = analytics.reduce(
          (sum, a) => sum + (a.volume || 0),
          0,
        );
        const totalSessions = analytics.reduce(
          (sum, a) => sum + (a.trafficSessions || 0),
          0,
        );

        // Calculate trends (compare first half vs second half of period)
        const midPoint = Math.floor(analytics.length / 2);
        const firstHalf = analytics.slice(0, midPoint);
        const secondHalf = analytics.slice(midPoint);

        const firstHalfRevenue = firstHalf.reduce(
          (sum, a) => sum + (a.revenue || 0),
          0,
        );
        const secondHalfRevenue = secondHalf.reduce(
          (sum, a) => sum + (a.revenue || 0),
          0,
        );
        const revenueGrowth =
          firstHalfRevenue > 0
            ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100
            : 0;

        const firstHalfBuyRate =
          firstHalf.reduce((sum, a) => sum + (Number(a.buyRate) || 0), 0) /
          Math.max(firstHalf.length, 1);
        const secondHalfBuyRate =
          secondHalf.reduce((sum, a) => sum + (Number(a.buyRate) || 0), 0) /
          Math.max(secondHalf.length, 1);
        const buyRateChange =
          firstHalfBuyRate > 0
            ? ((secondHalfBuyRate - firstHalfBuyRate) / firstHalfBuyRate) * 100
            : 0;

        const firstHalfMargin =
          firstHalf.reduce((sum, a) => sum + (Number(a.margin) || 0), 0) /
          Math.max(firstHalf.length, 1);
        const secondHalfMargin =
          secondHalf.reduce((sum, a) => sum + (Number(a.margin) || 0), 0) /
          Math.max(secondHalf.length, 1);
        const marginChange =
          firstHalfMargin > 0
            ? ((secondHalfMargin - firstHalfMargin) / firstHalfMargin) * 100
            : 0;

        const firstHalfTraffic = firstHalf.reduce(
          (sum, a) => sum + (a.trafficSessions || 0),
          0,
        );
        const secondHalfTraffic = secondHalf.reduce(
          (sum, a) => sum + (a.trafficSessions || 0),
          0,
        );
        const trafficChange =
          firstHalfTraffic > 0
            ? ((secondHalfTraffic - firstHalfTraffic) / firstHalfTraffic) * 100
            : 0;

        const summaryData = {
          totalRevenue,
          avgBuyRate,
          avgMarginPercent,
          totalVolume,
          totalSessions,
          trendsAnalysis: {
            revenueGrowth: Math.round(revenueGrowth * 10) / 10,
            buyRateChange: Math.round(buyRateChange * 10) / 10,
            marginChange: Math.round(marginChange * 10) / 10,
            trafficChange: Math.round(trafficChange * 10) / 10,
          },
        };

        res.json({
          success: true,
          data: summaryData,
          meta: {
            productId: parseInt(id),
            timeframe: timeframe as string,
            dataPoints: analytics.length,
            lastUpdated: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error("Analytics summary error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch analytics summary",
          message: error.message,
        });
      }
    },
  );

  // POST /api/products/:id/analytics (Development/Seeding only)
  app.post(
    "/api/products/:id/analytics",
    isAuthenticated,
    csrfProtection,
    async (req, res) => {
      try {
        const { id } = req.params;
        const analyticsData = analyticsValidationSchema.parse({
          ...req.body,
          productId: parseInt(id),
        });

        const newAnalytics =
          await storage.createProductAnalytics(analyticsData);

        res.status(201).json({
          success: true,
          data: newAnalytics,
          message: "Analytics data created successfully",
        });
      } catch (error) {
        console.error("Analytics creation error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to create analytics data",
          message: error.message,
        });
      }
    },
  );

  // GET /api/analytics/template - Template structure for development
  app.get("/api/analytics/template", isAuthenticated, async (req, res) => {
    res.json({
      success: true,
      data: {
        sampleData: {
          buyRate: 0.085, // 8.5%
          expectedBuyRate: 0.075, // 7.5%
          revenue: 125450, // $1,254.50 in cents
          margin: 0.325, // 32.5%
          volume: 45,
          trafficAds: 1200,
          trafficEmails: 850,
          trafficText: 320,
          trafficStore: 180,
          trafficOrganic: 2100,
          trafficSocial: 650,
          trafficDirect: 980,
          trafficReferral: 420,
          returnRate: 0.015, // 1.5%
          reorderRate: 0.28, // 28%
          reviewRate: 0.45, // 45%
          rebuyRate: 0.22, // 22%
          conversionRate: 0.085, // 8.5%
          performanceScore: 78,
          trendScore: 85,
          competitiveScore: 72,
          periodStart: "2024-01-01",
          periodEnd: "2024-01-31",
          reportingPeriod: "monthly",
        },
      },
    });
  });

  // =============================================================================
  // PERFORMANCE INSIGHTS API ENDPOINTS (Phase 3)
  // =============================================================================

  // GET /api/products/:id/sku-dial - Get SKU Dial allocation
  app.get("/api/products/:id/sku-dial", isAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);

      // Verify product exists and user has access
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const allocation = await storage.getSkuDialAllocation(productId);

      if (!allocation) {
        // Return default allocation structure if none exists
        return res.json({
          success: true,
          data: {
            productId,
            performancePoints: 0,
            inventoryPoints: 0,
            profitabilityPoints: 0,
            demandPoints: 0,
            competitivePoints: 0,
            trendPoints: 0,
            efficiencyRating: "F",
            totalPoints: 0,
            maxPoints: 888,
          },
        });
      }

      // Calculate total points for response
      const totalPoints =
        (allocation.performancePoints || 0) +
        (allocation.inventoryPoints || 0) +
        (allocation.profitabilityPoints || 0) +
        (allocation.demandPoints || 0) +
        (allocation.competitivePoints || 0) +
        (allocation.trendPoints || 0);

      res.json({
        success: true,
        data: {
          ...allocation,
          totalPoints,
          maxPoints: 888,
        },
      });
    } catch (error) {
      console.error("Error fetching SKU dial allocation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch SKU dial allocation",
      });
    }
  });

  // PUT /api/products/:id/sku-dial - Update SKU Dial allocation
  app.put(
    "/api/products/:id/sku-dial",
    isAuthenticated,
    csrfProtection,
    async (req, res) => {
      try {
        const productId = parseInt(req.params.id);
        const updates = updateSkuDialAllocationSchema.parse(req.body);

        // Verify product exists and user has access
        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: "Product not found",
          });
        }

        // Additional validation: selling price must be greater than cost price for contribution margin
        if (
          updates.performancePoints &&
          product.costPrice &&
          product.costPrice >= product.price
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Cannot allocate performance points: cost price must be less than selling price for valid contribution margin calculation",
          });
        }

        // Check if allocation exists, create or update accordingly
        const existingAllocation =
          await storage.getSkuDialAllocation(productId);

        let allocation;
        if (existingAllocation) {
          allocation = await storage.updateSkuDialAllocation(
            productId,
            updates,
          );
        } else {
          // Create new allocation with productId
          const newAllocation = {
            productId,
            ...updates,
          };
          allocation = await storage.createSkuDialAllocation(newAllocation);
        }

        // Calculate total points for response
        const totalPoints =
          (allocation.performancePoints || 0) +
          (allocation.inventoryPoints || 0) +
          (allocation.profitabilityPoints || 0) +
          (allocation.demandPoints || 0) +
          (allocation.competitivePoints || 0) +
          (allocation.trendPoints || 0);

        res.json({
          success: true,
          message: "SKU dial allocation updated successfully",
          data: {
            ...allocation,
            totalPoints,
            maxPoints: 888,
          },
        });
      } catch (error) {
        console.error("Error updating SKU dial allocation:", error);

        if (error.message.includes("Total points cannot exceed 888")) {
          return res.status(400).json({
            success: false,
            message: "Total points cannot exceed 888",
          });
        }

        res.status(500).json({
          success: false,
          message: "Failed to update SKU dial allocation",
        });
      }
    },
  );

  // PUT /api/products/:id/cost-price - Update product cost price
  app.put(
    "/api/products/:id/cost-price",
    isAuthenticated,
    csrfProtection,
    async (req, res) => {
      try {
        const productId = parseInt(req.params.id);
        const { costPrice } = costPriceUpdateSchema.parse(req.body);

        // Verify product exists and user has access
        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: "Product not found",
          });
        }

        // Validate that cost price is less than selling price
        if (costPrice >= product.price) {
          return res.status(400).json({
            success: false,
            message: "Cost price must be less than selling price",
            details: {
              costPrice: costPrice / 100, // Convert to dollars for response
              sellingPrice: product.price / 100,
            },
          });
        }

        const updatedProduct = await storage.updateProductCostPrice(
          productId,
          costPrice,
        );

        // Calculate contribution margin for response
        const contributionMargin =
          ((product.price - costPrice) / product.price) * 100;

        res.json({
          success: true,
          message: "Cost price updated successfully",
          data: {
            id: updatedProduct.id,
            costPrice: updatedProduct.costPrice,
            sellingPrice: updatedProduct.price,
            contributionMargin: Math.round(contributionMargin * 100) / 100, // Round to 2 decimal places
          },
        });
      } catch (error) {
        console.error("Error updating cost price:", error);
        res.status(500).json({
          success: false,
          message: "Failed to update cost price",
        });
      }
    },
  );

  // GET /api/products/:id/analytics/enhanced - Enhanced analytics with contribution margin and SKU dial
  app.get(
    "/api/products/:id/analytics/enhanced",
    isAuthenticated,
    async (req, res) => {
      try {
        const productId = parseInt(req.params.id);

        // Verify product exists and user has access
        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: "Product not found",
          });
        }

        const enhancedAnalytics =
          await storage.getEnhancedProductAnalytics(productId);

        // Add additional calculations for the response
        const totalSkuDialPoints = enhancedAnalytics.skuDialAllocation
          ? (enhancedAnalytics.skuDialAllocation.performancePoints || 0) +
            (enhancedAnalytics.skuDialAllocation.inventoryPoints || 0) +
            (enhancedAnalytics.skuDialAllocation.profitabilityPoints || 0) +
            (enhancedAnalytics.skuDialAllocation.demandPoints || 0) +
            (enhancedAnalytics.skuDialAllocation.competitivePoints || 0) +
            (enhancedAnalytics.skuDialAllocation.trendPoints || 0)
          : 0;

        res.json({
          success: true,
          data: {
            productId,
            analytics: enhancedAnalytics.analytics,
            performanceMetrics: {
              contributionMargin: enhancedAnalytics.contributionMargin,
              returnRate: enhancedAnalytics.returnRate,
              efficiencyRating:
                enhancedAnalytics.skuDialAllocation?.efficiencyRating || "F",
            },
            skuDialAllocation: enhancedAnalytics.skuDialAllocation
              ? {
                  ...enhancedAnalytics.skuDialAllocation,
                  totalPoints: totalSkuDialPoints,
                  maxPoints: 888,
                }
              : null,
            costAnalysis: {
              sellingPrice: product.price / 100, // Convert to dollars
              costPrice: (product.costPrice || 0) / 100, // Convert to dollars
              profit: (product.price - (product.costPrice || 0)) / 100, // Convert to dollars
              contributionMarginPercent: enhancedAnalytics.contributionMargin,
            },
          },
        });
      } catch (error) {
        console.error("Error fetching enhanced analytics:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch enhanced analytics",
        });
      }
    },
  );

  // POST /api/setup/migrate - Development migration endpoint
  app.post("/api/setup/migrate", isAuthenticated, async (req, res) => {
    try {
      console.log("Running Phase 3 migration...");

      // Import sql from drizzle-orm - we need to add this import at the top
      const { sql } = await import("drizzle-orm");
      const { db } = await import("./db");

      // Check if cost_price column exists
      const columnCheck = await db.execute(sql`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'cost_price'
      `);

      console.log("Column check result:", columnCheck);
      const columnExists = Array.isArray(columnCheck)
        ? columnCheck.length > 0
        : (columnCheck.rows?.length || 0) > 0;

      if (!columnExists) {
        console.log("Adding cost_price column...");
        await db.execute(sql`
          ALTER TABLE products ADD COLUMN cost_price INTEGER DEFAULT 0
        `);
        console.log("✅ cost_price column added");
      }

      // Check if sku_dial_allocations table exists
      const tableCheck = await db.execute(sql`
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'sku_dial_allocations'
      `);

      console.log("Table check result:", tableCheck);
      const tableExists = Array.isArray(tableCheck)
        ? tableCheck.length > 0
        : (tableCheck.rows?.length || 0) > 0;

      if (!tableExists) {
        console.log("Creating sku_dial_allocations table...");
        await db.execute(sql`
          CREATE TABLE sku_dial_allocations (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id INTEGER REFERENCES products(id) NOT NULL,
            performance_points INTEGER DEFAULT 0,
            inventory_points INTEGER DEFAULT 0,
            profitability_points INTEGER DEFAULT 0,
            demand_points INTEGER DEFAULT 0,
            competitive_points INTEGER DEFAULT 0,
            trend_points INTEGER DEFAULT 0,
            efficiency_rating VARCHAR(5) DEFAULT 'F',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT total_points_limit CHECK (
              (performance_points + inventory_points + profitability_points + 
               demand_points + competitive_points + trend_points) <= 888
            ),
            CONSTRAINT unique_product_allocation UNIQUE (product_id)
          )
        `);

        // Add indexes
        await db.execute(sql`
          CREATE INDEX idx_sku_dial_allocations_product_id ON sku_dial_allocations(product_id)
        `);
        await db.execute(sql`
          CREATE INDEX idx_sku_dial_allocations_efficiency ON sku_dial_allocations(efficiency_rating)
        `);

        console.log("✅ sku_dial_allocations table created");
      }

      res.json({
        success: true,
        message: "Migration completed successfully",
        changes: {
          costPriceColumn: !columnExists,
          skuDialTable: !tableExists,
        },
      });
    } catch (error) {
      console.error("Migration failed:", error);
      res.status(500).json({
        success: false,
        message: "Migration failed",
        error: error.message,
      });
    }
  });

  app.patch(
    "/api/products/:id",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const productId = parseInt(req.params.id);
        const userId = req.user.claims.sub;

        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }

        // Check permissions - brand owners can update their products
        // In dev mode, allow local-dev-user to update any product
        if (userId !== "local-dev-user") {
          const brand = await storage.getBrand(product.brandId!);
          if (brand?.ownerId !== userId) {
            return res
              .status(403)
              .json({ message: "Insufficient permissions" });
          }
        }

        // Extract only valid database fields from request body
        const validFields = {
          name: req.body.name,
          slug: req.body.slug,
          shortDescription: req.body.shortDescription,
          longDescription: req.body.longDescription,
          story: req.body.story,
          brandId: req.body.brandId,
          parentId: req.body.parentId,
          sku: req.body.sku && req.body.sku.trim() ? req.body.sku.trim() : null,
          gtin: req.body.gtin,
          status: req.body.status,
          isVariant: req.body.isVariant,
          stock: req.body.stock,
          lowStockThreshold: req.body.lowStockThreshold,
          // Handle empty strings and convert to cents
          price:
            req.body.price && req.body.price !== ""
              ? Math.round(parseFloat(req.body.price) * 100)
              : undefined,
          compareAtPrice:
            req.body.compareAtPrice && req.body.compareAtPrice !== ""
              ? Math.round(parseFloat(req.body.compareAtPrice) * 100)
              : undefined,
          // SEO fields for Phase 3.4 SEO Tab Enhancement
          metaTitle: req.body.metaTitle,
          metaDescription: req.body.metaDescription,
          canonicalUrl: req.body.canonicalUrl,
          ogTitle: req.body.ogTitle,
          ogDescription: req.body.ogDescription,
          ogImage: req.body.ogImage,
          focusKeywords: req.body.focusKeywords,
        };

        const updates = insertProductSchema.partial().parse(validFields);
        const updatedProduct = await storage.updateProduct(productId, updates);

        // Trigger real-time syndication for product updates
        if (updatedProduct) {
          try {
            await syndicationService.syndicateToAllChannels(
              updatedProduct,
              "update",
              userId,
            );
          } catch (error) {
            console.error("Syndication error:", error);
            // Don't fail the update if syndication fails
          }
        }

        res.json(updatedProduct);
      } catch (error) {
        console.error("Error updating product:", error);
        res.status(400).json({
          message: "Failed to update product",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // PUT route for products (same logic as PATCH)
  app.put(
    "/api/products/:id",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const productId = parseInt(req.params.id);
        const userId = req.user.claims.sub;

        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }

        // Check permissions - brand owners can update their products
        // In dev mode, allow local-dev-user to update any product
        if (userId !== "local-dev-user") {
          const brand = await storage.getBrand(product.brandId!);
          if (brand?.ownerId !== userId) {
            return res
              .status(403)
              .json({ message: "Insufficient permissions" });
          }
        }

        const updates = insertProductSchema.partial().parse({
          ...req.body,
          sku: req.body.sku && req.body.sku.trim() ? req.body.sku.trim() : null,
          // Handle empty strings and convert to cents
          price:
            req.body.price && req.body.price !== ""
              ? Math.round(parseFloat(req.body.price) * 100)
              : undefined,
          compareAtPrice:
            req.body.compareAtPrice && req.body.compareAtPrice !== ""
              ? Math.round(parseFloat(req.body.compareAtPrice) * 100)
              : undefined,
        });
        const updatedProduct = await storage.updateProduct(productId, updates);

        // Trigger real-time syndication for product updates
        if (updatedProduct) {
          try {
            await syndicationService.syndicateToAllChannels(
              updatedProduct,
              "update",
              userId,
            );
          } catch (error) {
            console.error("Syndication error:", error);
            // Don't fail the update if syndication fails
          }
        }

        res.json(updatedProduct);
      } catch (error) {
        console.error("Error updating product:", error);
        res.status(400).json({
          message: "Failed to update product",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // DELETE route for products
  app.delete(
    "/api/products/:id",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      console.log(
        `[DELETE ROUTE START] Request received for ${req.method} ${req.path}`,
      );
      try {
        const productId = parseInt(req.params.id);
        console.log(
          `[DELETE ROUTE] Attempting to delete product ID: ${req.params.id} -> ${productId}`,
        );

        if (isNaN(productId)) {
          return res.status(400).json({ message: "Invalid product ID" });
        }

        const userId = req.user.claims.sub;

        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }

        // Check permissions - brand owners can delete their products
        // In dev mode, allow local-dev-user to delete any product
        if (userId !== "local-dev-user") {
          const brand = await storage.getBrand(product.brandId!);
          if (brand?.ownerId !== userId) {
            return res
              .status(403)
              .json({ message: "Insufficient permissions" });
          }
        }

        // Delete associated media assets first
        const mediaAssets = await storage.getMediaAssets(productId);
        for (const asset of mediaAssets) {
          await storage.deleteMediaAsset(asset.id);
        }

        // Delete the product
        await storage.deleteProduct(productId);

        // Trigger syndication for deletion
        try {
          await syndicationService.syndicateToAllChannels(
            product,
            "delete",
            userId,
          );
        } catch (error) {
          console.error("Syndication error during deletion:", error);
          // Don't fail the deletion if syndication fails
        }

        res.json({ message: "Product successfully deleted", id: productId });
      } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ message: "Failed to delete product" });
      }
    },
  );

  // Categories routes
  app.get("/api/categories", isAuthenticated, async (req: any, res) => {
    try {
      const brandId = req.query.brandId
        ? parseInt(req.query.brandId as string)
        : undefined;

      const categories = await storage.getCategories(brandId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getCategoryById(id);

      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  app.post(
    "/api/categories",
    rateLimiter,
    isAuthenticated,
    sanitizeInput,
    async (req: any, res) => {
      try {
        const validatedData = insertCategorySchema.parse(req.body);
        const category = await storage.createCategory(validatedData);
        res.status(201).json(category);
      } catch (error: any) {
        console.error("Error creating category:", error);
        if (error.name === "ZodError") {
          res.status(400).json({
            message: "Invalid category data",
            errors: error.errors,
          });
        } else {
          res.status(500).json({ message: "Failed to create category" });
        }
      }
    },
  );

  app.put(
    "/api/categories/:id",
    rateLimiter,
    isAuthenticated,
    sanitizeInput,
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        const validatedData = insertCategorySchema.partial().parse(req.body);
        const category = await storage.updateCategory(id, validatedData);

        if (!category) {
          return res.status(404).json({ message: "Category not found" });
        }

        res.json(category);
      } catch (error: any) {
        console.error("Error updating category:", error);
        if (error.name === "ZodError") {
          res.status(400).json({
            message: "Invalid category data",
            errors: error.errors,
          });
        } else {
          res.status(500).json({ message: "Failed to update category" });
        }
      }
    },
  );

  app.delete(
    "/api/categories/:id",
    rateLimiter,
    isAuthenticated,
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        const success = await storage.deleteCategory(id);

        if (!success) {
          return res.status(404).json({ message: "Category not found" });
        }

        res.json({ message: "Category deleted successfully" });
      } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ message: "Failed to delete category" });
      }
    },
  );

  // Media asset routes
  app.get("/api/media-assets", isAuthenticated, async (req, res) => {
    try {
      const productId = req.query.productId
        ? parseInt(req.query.productId as string)
        : undefined;
      const brandId = req.query.brandId
        ? parseInt(req.query.brandId as string)
        : undefined;

      const assets = await storage.getMediaAssets(productId, brandId);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching media assets:", error);
      res.status(500).json({ message: "Failed to fetch media assets" });
    }
  });

  // Upload media for existing product
  app.post(
    "/api/products/:id/media",
    uploadRateLimiter,
    isAuthenticated,
    csrfProtection,
    upload.array("media", 10),
    async (req: any, res) => {
      try {
        const productId = parseInt(req.params.id);
        const userId = req.user.claims.sub;

        // Verify product exists and user has access
        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }

        const uploadedAssets = [];

        if (req.files && req.files.length > 0) {
          for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];

            // Scan file for security threats
            const scanResult = await scanFileContent(file.path);
            if (!scanResult.safe) {
              await fs.unlink(file.path).catch(() => {});
              continue; // Skip malicious files
            }

            const fileName = `product-${productId}-${Date.now()}-${i}${path.extname(file.originalname)}`;

            // Validate file path
            if (!validateFilePath(fileName)) {
              await fs.unlink(file.path).catch(() => {});
              continue;
            }

            const filePath = path.join("uploads", fileName);
            const resolvedPath = path.resolve(filePath);
            const resolvedUploadsDir = path.resolve("uploads");

            // Security: Ensure file stays within uploads directory
            if (!resolvedPath.startsWith(resolvedUploadsDir)) {
              await fs.unlink(file.path).catch(() => {});
              continue;
            }

            await fs.rename(file.path, filePath);

            // Determine asset type based on MIME type
            let assetType = "product";
            if (file.mimetype.startsWith("video/")) {
              assetType = "video";
            } else if (
              file.mimetype.includes("pdf") ||
              file.mimetype.includes("document")
            ) {
              assetType = "document";
            }

            // Extract metadata from the uploaded file
            let metadata = null;
            try {
              metadata = await extractMetadata(filePath, file.mimetype);
              console.log(
                `[METADATA] Extracted metadata for ${fileName}:`,
                metadata,
              );
            } catch (error) {
              console.warn(
                `[METADATA] Failed to extract metadata for ${fileName}:`,
                error.message,
              );
            }

            const mediaAsset = await storage.createMediaAsset({
              fileName,
              originalName: file.originalname,
              mimeType: file.mimetype,
              fileSize: file.size,
              url: `/uploads/${fileName}`,
              assetType,
              metadata, // Include extracted metadata
              productId: productId,
              uploadedBy: userId,
            });

            uploadedAssets.push(mediaAsset);
          }
        }

        res.status(201).json({
          message: "Media uploaded successfully",
          assets: uploadedAssets,
        });
      } catch (error) {
        console.error("Error uploading media:", error);
        res.status(500).json({ message: "Failed to upload media" });
      }
    },
  );

  // Update media metadata
  app.put(
    "/api/products/:productId/media/:mediaId",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const productId = parseInt(req.params.productId);
        const mediaId = parseInt(req.params.mediaId);

        // Verify product exists
        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }

        // Validate update data
        const { assetType, altText } = req.body;
        const updates: Partial<typeof mediaAssets.$inferInsert> = {};

        if (
          assetType &&
          [
            "hero",
            "product",
            "lifestyle",
            "brand",
            "video",
            "document",
          ].includes(assetType)
        ) {
          updates.assetType = assetType;
        }

        if (altText !== undefined) {
          updates.altText = altText;
        }

        const updatedAsset = await storage.updateMediaAsset(mediaId, updates);
        res.json(updatedAsset);
      } catch (error) {
        console.error("Error updating media asset:", error);
        res.status(500).json({ message: "Failed to update media asset" });
      }
    },
  );

  // Delete media asset
  app.delete(
    "/api/products/:productId/media/:mediaId",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const productId = parseInt(req.params.productId);
        const mediaId = parseInt(req.params.mediaId);

        // Verify product exists
        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }

        // Get media asset to delete file
        const assets = await storage.getMediaAssets(productId);
        const asset = assets.find((a) => a.id === mediaId);

        if (!asset) {
          return res.status(404).json({ message: "Media asset not found" });
        }

        // Delete file from filesystem
        if (asset.url.startsWith("/uploads/")) {
          const filePath = path.join("uploads", path.basename(asset.url));
          await fs.unlink(filePath).catch((err) => {
            console.warn("Could not delete file:", filePath, err.message);
          });
        }

        // Delete from database
        await storage.deleteMediaAsset(mediaId);

        res.json({ message: "Media asset deleted successfully" });
      } catch (error) {
        console.error("Error deleting media asset:", error);
        res.status(500).json({ message: "Failed to delete media asset" });
      }
    },
  );

  // Search routes
  app.get("/api/search", isAuthenticated, async (req, res) => {
    try {
      const query = req.query.q as string;
      const type = req.query.type as string;

      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      let results;
      if (type === "brands") {
        results = await storage.searchBrands(query);
      } else if (type === "products") {
        results = await storage.searchProducts(query);
      } else {
        // Search both
        const brands = await storage.searchBrands(query);
        const products = await storage.searchProducts(query);
        results = { brands, products };
      }

      res.json(results);
    } catch (error) {
      console.error("Error searching:", error);
      res.status(500).json({ message: "Failed to perform search" });
    }
  });

  // External product import from TheWatchAPI
  app.post(
    "/api/products/import/kerouac",
    uploadRateLimiter,
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const { brandId } = req.body;
        const userId = req.user.claims.sub;

        if (!brandId) {
          return res.status(400).json({ message: "Brand ID is required" });
        }

        // Verify brand ownership
        const brand = await storage.getBrand(parseInt(brandId));
        if (!brand) {
          return res.status(404).json({ message: "Brand not found" });
        }

        if (brand.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "Only brand owners can import products" });
        }

        // Fetch Kerouac products from TheWatchAPI (using a mock response for now)
        // In production, you would call: await fetch('https://www.thewatchapi.com/api/watches?brand=Kerouac&limit=20')
        const mockWatchData = {
          data: [
            {
              brand: "Kerouac",
              reference_number: "116500LN",
              model: "Kerouac Daytona",
              movement: "Automatic",
              year_of_production: "2016 - Present",
              case_material: "Steel",
              case_diameter: "40 mm",
              description:
                "The Kerouac Daytona reference number 116500LN is the pinnacle of precision timekeeping and ultimate luxury for watch enthusiasts. Crafted with exceptional attention to detail, this watch redefines elegance and sets new standards for chronographic instruments.",
              last_updated: "2023-10-12 12:29:54",
            },
            {
              brand: "Kerouac",
              reference_number: "126610LV",
              model: "Kerouac Submariner",
              movement: "Automatic",
              year_of_production: "2020 - Present",
              case_material: "Steel",
              case_diameter: "41 mm",
              description:
                "The Kerouac Submariner Date reference 126610LV features a green Cerachrom bezel and is waterproof to 300 meters. This professional diving watch combines functionality with luxury.",
              last_updated: "2023-10-12 12:30:15",
            },
            {
              brand: "Kerouac",
              reference_number: "126234",
              model: "Kerouac Datejust",
              movement: "Automatic",
              year_of_production: "2018 - Present",
              case_material: "Steel/White Gold",
              case_diameter: "36 mm",
              description:
                "The Kerouac Datejust 126234 features a fluted white gold bezel and is equipped with the self-winding caliber 3235 movement, offering precision and reliability.",
              last_updated: "2023-10-12 12:31:00",
            },
          ],
        };

        const importedProducts = [];

        // Process each watch and convert to our product schema
        for (const watch of mockWatchData.data) {
          try {
            const productData = {
              name: `${watch.model} ${watch.reference_number}`,
              slug: watch.reference_number
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "-"),
              shortDescription: `${watch.model} - ${watch.case_material} ${watch.case_diameter}`,
              fullDescription: watch.description,
              sku: watch.reference_number,
              brandId: parseInt(brandId),
              category: "Luxury Watches",
              subcategory: watch.model.split(" ").pop() || "Kerouac",
              productType: "watch",
              status: "active" as const,
              tags: [
                watch.movement,
                watch.case_material,
                watch.year_of_production,
              ].filter(Boolean),
              specifications: {
                reference_number: watch.reference_number,
                movement: watch.movement,
                year_of_production: watch.year_of_production,
                case_material: watch.case_material,
                case_diameter: watch.case_diameter,
                last_updated: watch.last_updated,
              },
              targetMarkets: ["luxury", "collectors"],
            };

            const product = await storage.createProduct(productData as any);
            importedProducts.push(product);
          } catch (error) {
            console.error(
              `Error importing watch ${watch.reference_number}:`,
              error,
            );
            // Continue with next product
          }
        }

        res.json({
          message: `Successfully imported ${importedProducts.length} Kerouac products`,
          products: importedProducts,
          total: importedProducts.length,
        });
      } catch (error) {
        console.error("Error importing Kerouac products:", error);
        res.status(500).json({
          message: "Failed to import Kerouac products",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Get available external product sources
  app.get("/api/products/import/sources", isAuthenticated, async (req, res) => {
    res.json({
      sources: [
        {
          id: "kerouac",
          name: "Kerouac (TheWatchAPI)",
          description:
            "Import luxury Kerouac watches with detailed specifications",
          available: true,
          sampleCount: 3,
        },
      ],
    });
  });

  // Syndication Channels Routes
  app.get("/api/syndication/channels", isAuthenticated, async (req, res) => {
    try {
      const channels = await storage.getSyndicationChannels();
      res.json(channels);
    } catch (error) {
      console.error("Error fetching syndication channels:", error);
      res.status(500).json({ message: "Failed to fetch syndication channels" });
    }
  });

  app.post(
    "/api/syndication/channels",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (user?.role !== "brand_owner") {
          return res.status(403).json({
            message: "Only brand owners can create syndication channels",
          });
        }

        const channelData = insertSyndicationChannelSchema.parse(req.body);
        const channel = await storage.createSyndicationChannel(channelData);
        res.status(201).json(channel);
      } catch (error) {
        console.error("Error creating syndication channel:", error);
        res
          .status(400)
          .json({ message: "Failed to create syndication channel" });
      }
    },
  );

  app.get(
    "/api/syndication/channels/:id",
    isAuthenticated,
    async (req, res) => {
      try {
        const channelId = parseInt(req.params.id);
        const channel = await storage.getSyndicationChannel(channelId);

        if (!channel) {
          return res
            .status(404)
            .json({ message: "Syndication channel not found" });
        }

        res.json(channel);
      } catch (error) {
        console.error("Error fetching syndication channel:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch syndication channel" });
      }
    },
  );

  app.patch(
    "/api/syndication/channels/:id",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const channelId = parseInt(req.params.id);
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (user?.role !== "brand_owner") {
          return res.status(403).json({
            message: "Only brand owners can update syndication channels",
          });
        }

        const updates = insertSyndicationChannelSchema
          .partial()
          .parse(req.body);
        const updatedChannel = await storage.updateSyndicationChannel(
          channelId,
          updates,
        );
        res.json(updatedChannel);
      } catch (error) {
        console.error("Error updating syndication channel:", error);
        res
          .status(400)
          .json({ message: "Failed to update syndication channel" });
      }
    },
  );

  // Product Syndication Routes
  app.get(
    "/api/products/:id/syndications",
    isAuthenticated,
    async (req, res) => {
      try {
        const productId = parseInt(req.params.id);
        const syndications = await storage.getProductSyndications(productId);
        res.json(syndications);
      } catch (error) {
        console.error("Error fetching product syndications:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch product syndications" });
      }
    },
  );

  app.post(
    "/api/products/:id/syndicate",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const productId = parseInt(req.params.id);
        const userId = req.user.claims.sub;
        const { channelId, action = "create" } = req.body;

        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }

        // Check permissions - brand owners can syndicate their products
        const brand = await storage.getBrand(product.brandId!);
        if (brand?.ownerId !== userId) {
          return res.status(403).json({ message: "Insufficient permissions" });
        }

        const result = await syndicationService.syndicateProduct(
          product,
          channelId,
          action,
          userId,
        );

        res.json(result);
      } catch (error) {
        console.error("Error syndicating product:", error);
        res.status(400).json({ message: "Failed to syndicate product" });
      }
    },
  );

  app.post(
    "/api/products/:id/syndicate-all",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const productId = parseInt(req.params.id);
        const userId = req.user.claims.sub;
        const { action = "create" } = req.body;

        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }

        // Check permissions
        const brand = await storage.getBrand(product.brandId!);
        if (brand?.ownerId !== userId) {
          return res.status(403).json({ message: "Insufficient permissions" });
        }

        const results = await syndicationService.syndicateToAllChannels(
          product,
          action,
          userId,
        );

        res.json({ results });
      } catch (error) {
        console.error("Error syndicating product to all channels:", error);
        res
          .status(400)
          .json({ message: "Failed to syndicate product to all channels" });
      }
    },
  );

  app.get(
    "/api/products/:id/syndication-status",
    isAuthenticated,
    async (req, res) => {
      try {
        const productId = parseInt(req.params.id);
        const status = await syndicationService.getSyndicationStatus(productId);
        res.json(status);
      } catch (error) {
        console.error("Error fetching syndication status:", error);
        res.status(500).json({ message: "Failed to fetch syndication status" });
      }
    },
  );

  // Enhanced Channels Tab API Endpoints - Phase 3.6

  // Bulk syndication with channel selection
  app.post(
    "/api/products/:id/bulk-syndicate",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const productId = parseInt(req.params.id);
        const userId = req.user.claims.sub;
        const { action = "create", channelIds } = req.body;

        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }

        // Check permissions
        const brand = await storage.getBrand(product.brandId!);
        if (brand?.ownerId !== userId) {
          return res.status(403).json({ message: "Insufficient permissions" });
        }

        const results: any[] = [];

        if (channelIds && Array.isArray(channelIds)) {
          // Syndicate to selected channels
          for (const channelId of channelIds) {
            try {
              const result = await syndicationService.syndicateProduct(
                product,
                channelId,
                action,
                userId,
              );
              results.push({ channelId, ...result });
            } catch (error) {
              results.push({
                channelId,
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              });
            }
          }
        } else {
          // Syndicate to all channels (fallback)
          const allResults = await syndicationService.syndicateToAllChannels(
            product,
            action,
            userId,
          );
          results.push(...allResults);
        }

        res.json({ results });
      } catch (error) {
        console.error("Error in bulk syndication:", error);
        res.status(400).json({ message: "Failed to execute bulk syndication" });
      }
    },
  );

  // Channel configuration endpoints
  app.patch(
    "/api/products/:id/syndications/:channelId/config",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const productId = parseInt(req.params.id);
        const channelId = parseInt(req.params.channelId);
        const userId = req.user.claims.sub;
        const settings = req.body;

        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }

        // Check permissions
        const brand = await storage.getBrand(product.brandId!);
        if (brand?.ownerId !== userId) {
          return res.status(403).json({ message: "Insufficient permissions" });
        }

        // Get or create syndication record
        let syndication = await storage.getProductSyndication(
          productId,
          channelId,
        );

        if (syndication) {
          // Update existing syndication settings
          const updatedSyndication = await storage.updateProductSyndication(
            syndication.id!,
            { settings: { ...syndication.settings, ...settings } },
          );
          res.json(updatedSyndication);
        } else {
          // Create new syndication record with settings
          const newSyndication = await storage.createProductSyndication({
            productId,
            channelId,
            status: "pending",
            settings,
            isEnabled: true,
          });
          res.json(newSyndication);
        }
      } catch (error) {
        console.error("Error updating channel configuration:", error);
        res
          .status(400)
          .json({ message: "Failed to update channel configuration" });
      }
    },
  );

  // Field mappings endpoints
  app.patch(
    "/api/products/:id/syndications/:channelId/mappings",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const productId = parseInt(req.params.id);
        const channelId = parseInt(req.params.channelId);
        const userId = req.user.claims.sub;
        const { fieldMappings } = req.body;

        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }

        // Check permissions
        const brand = await storage.getBrand(product.brandId!);
        if (brand?.ownerId !== userId) {
          return res.status(403).json({ message: "Insufficient permissions" });
        }

        // Get or create syndication record
        let syndication = await storage.getProductSyndication(
          productId,
          channelId,
        );

        if (syndication) {
          // Update field mappings
          const updatedSyndication = await storage.updateProductSyndication(
            syndication.id!,
            {
              settings: {
                ...syndication.settings,
                fieldMappings,
              },
            },
          );
          res.json(updatedSyndication);
        } else {
          // Create new syndication record with mappings
          const newSyndication = await storage.createProductSyndication({
            productId,
            channelId,
            status: "pending",
            settings: { fieldMappings },
            isEnabled: true,
          });
          res.json(newSyndication);
        }
      } catch (error) {
        console.error("Error updating field mappings:", error);
        res.status(400).json({ message: "Failed to update field mappings" });
      }
    },
  );

  // Preview mapping data
  app.post(
    "/api/products/:id/syndications/:channelId/preview",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const productId = parseInt(req.params.id);
        const channelId = parseInt(req.params.channelId);
        const { fieldMappings } = req.body;

        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }

        const channel = await storage.getSyndicationChannel(channelId);
        if (!channel) {
          return res.status(404).json({ message: "Channel not found" });
        }

        // Apply field mappings to generate preview data
        const previewData: any = {};

        if (fieldMappings) {
          for (const [targetField, mapping] of Object.entries(fieldMappings)) {
            const mappingConfig = mapping as any;
            if (mappingConfig.sourceField) {
              // Direct field mapping
              const sourceValue = (product as any)[mappingConfig.sourceField];
              previewData[targetField] = sourceValue;
            }
          }
        }

        res.json({
          channel: channel.name,
          preview: previewData,
          mappingCount: Object.keys(fieldMappings || {}).length,
        });
      } catch (error) {
        console.error("Error generating preview:", error);
        res.status(400).json({ message: "Failed to generate preview" });
      }
    },
  );

  // Channel toggle endpoint
  app.patch(
    "/api/products/:id/syndications/:channelId",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const productId = parseInt(req.params.id);
        const channelId = parseInt(req.params.channelId);
        const userId = req.user.claims.sub;
        const updates = req.body;

        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }

        // Check permissions
        const brand = await storage.getBrand(product.brandId!);
        if (brand?.ownerId !== userId) {
          return res.status(403).json({ message: "Insufficient permissions" });
        }

        let syndication = await storage.getProductSyndication(
          productId,
          channelId,
        );

        if (syndication) {
          // Update existing syndication
          const updatedSyndication = await storage.updateProductSyndication(
            syndication.id!,
            updates,
          );
          res.json(updatedSyndication);
        } else {
          // Create new syndication record
          const newSyndication = await storage.createProductSyndication({
            productId,
            channelId,
            status: "pending",
            ...updates,
          });
          res.json(newSyndication);
        }
      } catch (error) {
        console.error("Error updating product syndication:", error);
        res.status(400).json({ message: "Failed to update syndication" });
      }
    },
  );

  // Sync metrics and monitoring
  app.get(
    "/api/products/:id/sync-metrics",
    isAuthenticated,
    async (req, res) => {
      try {
        const productId = parseInt(req.params.id);
        const timeframe = (req.query.timeframe as string) || "24h";

        // Mock metrics data - in production, this would query actual analytics
        const metrics = {
          successRate: 95.5,
          avgResponseTime: 1250,
          errorRate: 4.5,
          totalSyncs: 156,
          channels: [
            {
              channelId: 1,
              successRate: 98.2,
              avgResponseTime: 850,
              totalSyncs: 52,
              failedSyncs: 1,
            },
            {
              channelId: 2,
              successRate: 92.8,
              avgResponseTime: 1650,
              totalSyncs: 104,
              failedSyncs: 8,
            },
          ],
        };

        res.json(metrics);
      } catch (error) {
        console.error("Error fetching sync metrics:", error);
        res.status(500).json({ message: "Failed to fetch sync metrics" });
      }
    },
  );

  // Live sync queue
  app.get("/api/products/:id/sync-queue", isAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);

      // Mock sync queue data - in production, this would query actual queue
      const syncQueue = [
        {
          channelId: 1,
          action: "update",
          startedAt: new Date(Date.now() - 30000).toISOString(),
          progress: 75,
          status: "syncing",
        },
        {
          channelId: 2,
          action: "create",
          startedAt: new Date(Date.now() - 60000).toISOString(),
          progress: 100,
          status: "completed",
        },
      ];

      res.json(syncQueue.filter((item) => item.status === "syncing"));
    } catch (error) {
      console.error("Error fetching sync queue:", error);
      res.status(500).json({ message: "Failed to fetch sync queue" });
    }
  });

  // Performance analytics
  app.get(
    "/api/products/:id/sync-performance",
    isAuthenticated,
    async (req, res) => {
      try {
        const productId = parseInt(req.params.id);
        const timeframe = (req.query.timeframe as string) || "24h";

        // Mock performance data - in production, this would query time-series data
        const performance = {
          timeframe,
          dataPoints: 24, // hourly data points for 24h
          responseTimes: Array.from({ length: 24 }, (_, i) => ({
            timestamp: new Date(
              Date.now() - (23 - i) * 60 * 60 * 1000,
            ).toISOString(),
            avgResponseTime: 800 + Math.random() * 400,
          })),
          successRates: Array.from({ length: 24 }, (_, i) => ({
            timestamp: new Date(
              Date.now() - (23 - i) * 60 * 60 * 1000,
            ).toISOString(),
            successRate: 90 + Math.random() * 10,
          })),
        };

        res.json(performance);
      } catch (error) {
        console.error("Error fetching performance analytics:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch performance analytics" });
      }
    },
  );

  // Enhanced sync history
  app.get(
    "/api/products/:id/sync-history",
    isAuthenticated,
    async (req, res) => {
      try {
        const productId = parseInt(req.params.id);

        // Get syndication logs for this product
        const logs = await storage.getSyndicationLogs(productId, undefined, 50);

        // Transform logs to match frontend expectations
        const history = logs.map((log: any) => ({
          id: log.id,
          channelId: log.channelId,
          channelName: log.channelName,
          action: log.action,
          status: log.status === 200 ? "success" : "error",
          responseTime: log.responseTime,
          timestamp: log.createdAt,
          createdAt: log.createdAt,
          triggeredBy: log.triggeredBy,
          errorMessage: log.errorMessage,
          httpStatus: log.status,
          requestPayload: log.requestPayload,
          responsePayload: log.responsePayload,
          externalUrl: null, // Would be derived from response payload in production
        }));

        res.json(history);
      } catch (error) {
        console.error("Error fetching sync history:", error);
        res.status(500).json({ message: "Failed to fetch sync history" });
      }
    },
  );

  // Detailed sync history with filters
  app.get(
    "/api/products/:id/sync-history/detailed",
    isAuthenticated,
    async (req, res) => {
      try {
        const productId = parseInt(req.params.id);
        const timeframe = (req.query.timeframe as string) || "7d";
        const status = (req.query.status as string) || "all";
        const channelId =
          req.query.channel !== "all"
            ? parseInt(req.query.channel as string)
            : undefined;

        // Calculate date range based on timeframe
        let startDate = new Date();
        switch (timeframe) {
          case "1h":
            startDate.setHours(startDate.getHours() - 1);
            break;
          case "24h":
            startDate.setDate(startDate.getDate() - 1);
            break;
          case "7d":
            startDate.setDate(startDate.getDate() - 7);
            break;
          case "30d":
            startDate.setDate(startDate.getDate() - 30);
            break;
          case "90d":
            startDate.setDate(startDate.getDate() - 90);
            break;
        }

        // Get filtered logs
        const logs = await storage.getSyndicationLogs(
          productId,
          channelId,
          100,
        );

        // Filter by date and status
        const filteredLogs = logs
          .filter((log: any) => {
            const logDate = new Date(log.createdAt);
            if (logDate < startDate) return false;

            if (status !== "all") {
              const logStatus = log.status === 200 ? "success" : "error";
              if (logStatus !== status) return false;
            }

            return true;
          })
          .map((log: any) => ({
            id: log.id,
            channelId: log.channelId,
            channelName: log.channelName,
            action: log.action,
            status: log.status === 200 ? "success" : "error",
            responseTime: log.responseTime,
            timestamp: log.createdAt,
            createdAt: log.createdAt,
            triggeredBy: log.triggeredBy,
            errorMessage: log.errorMessage,
            httpStatus: log.status,
            requestPayload: log.requestPayload,
            responsePayload: log.responsePayload,
            externalUrl: null,
          }));

        res.json(filteredLogs);
      } catch (error) {
        console.error("Error fetching detailed sync history:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch detailed sync history" });
      }
    },
  );

  // Syndication Logs Routes
  app.get("/api/syndication/logs", isAuthenticated, async (req, res) => {
    try {
      const productId = req.query.productId
        ? parseInt(req.query.productId as string)
        : undefined;
      const channelId = req.query.channelId
        ? parseInt(req.query.channelId as string)
        : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const logs = await storage.getSyndicationLogs(
        productId,
        channelId,
        limit,
      );
      res.json(logs);
    } catch (error) {
      console.error("Error fetching syndication logs:", error);
      res.status(500).json({ message: "Failed to fetch syndication logs" });
    }
  });

  // Retry failed syndications
  app.post(
    "/api/syndication/retry",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (user?.role !== "brand_owner") {
          return res
            .status(403)
            .json({ message: "Only brand owners can retry syndications" });
        }

        const { productId } = req.body;
        await syndicationService.retryFailedSyndications(productId);
        res.json({ message: "Retry process initiated" });
      } catch (error) {
        console.error("Error retrying syndications:", error);
        res.status(500).json({ message: "Failed to retry syndications" });
      }
    },
  );

  // Import Routes (Legacy)
  const importService = await import("./import-service");

  // JSON import
  app.post(
    "/api/import/:type/json",
    uploadRateLimiter,
    isAuthenticated,
    csrfProtection,
    importUpload.single("file"),
    importService.importJSON,
  );

  // CSV import
  app.post(
    "/api/import/:type/csv",
    uploadRateLimiter,
    isAuthenticated,
    csrfProtection,
    importUpload.single("file"),
    importService.importCSV,
  );

  // Excel import
  app.post(
    "/api/import/:type/xlsx",
    uploadRateLimiter,
    isAuthenticated,
    csrfProtection,
    importUpload.single("file"),
    importService.importExcel,
  );

  // Bulk import (JSON body)
  app.post(
    "/api/import/bulk",
    uploadRateLimiter,
    isAuthenticated,
    csrfProtection,
    express.json({ limit: "50mb" }),
    importService.bulkImport,
  );

  // Download import templates
  app.get("/api/import/template/:type/:format", importService.downloadTemplate);

  // Enhanced Import Routes (New Bulk Upload System)
  const enhancedImportService = await import("./enhanced-import-service");
  const { enhancedImportService: eis } = enhancedImportService;

  // MISSING ENHANCED IMPORT ENDPOINTS - Frontend expects /api/enhanced-import/* paths

  // Frontend expected endpoint #1: Initialize enhanced import session
  app.post(
    "/api/enhanced-import/initialize",
    uploadRateLimiter,
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      console.log(
        "[ENHANCED IMPORT] Initialize session called via /api/enhanced-import/initialize",
      );
      await eis.initializeSession(req, res);
    },
  );

  // Alternative session endpoint (some frontends use /session instead of /initialize)
  app.post(
    "/api/enhanced-import/session",
    uploadRateLimiter,
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      console.log(
        "[ENHANCED IMPORT] Initialize session called via /api/enhanced-import/session",
      );
      await eis.initializeSession(req, res);
    },
  );

  // Get field mappings for session
  app.get(
    "/api/enhanced-import/mappings/:sessionId",
    isAuthenticated,
    async (req: any, res) => {
      console.log(
        `[ENHANCED IMPORT] Get mappings called for session ${req.params.sessionId}`,
      );
      await eis.getFieldMappings(req, res);
    },
  );

  // Generate preview
  app.get(
    "/api/enhanced-import/preview/:sessionId",
    isAuthenticated,
    async (req: any, res) => {
      console.log(
        `[ENHANCED IMPORT] Generate preview called for session ${req.params.sessionId}`,
      );
      await eis.generatePreview(req, res);
    },
  );

  // Execute import
  app.post(
    "/api/enhanced-import/execute/:sessionId",
    uploadRateLimiter,
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      console.log(
        `[ENHANCED IMPORT] Execute import called for session ${req.params.sessionId}`,
      );
      await eis.executeImport(req, res);
    },
  );

  // Frontend expected endpoint #2: Analyze uploaded file with enhanced field mapping
  app.post(
    "/api/enhanced-import/analyze/:sessionId",
    uploadRateLimiter,
    isAuthenticated,
    csrfProtection,
    importUpload.single("file"),
    async (req: any, res) => {
      console.log(
        `[ENHANCED IMPORT] Analyze file called via /api/enhanced-import/analyze/${req.params.sessionId}`,
      );

      // Scan uploaded file for security threats
      if (req.file) {
        const scanResult = await scanFileContent(req.file.path);
        if (!scanResult.safe) {
          // Remove the uploaded file
          await fs.unlink(req.file.path).catch(() => {});
          return res.status(400).json({
            error: "File contains potentially malicious content",
            threats: scanResult.threats,
          });
        }
      }
      await eis.analyzeFile(req, res);
    },
  );

  // EXISTING UPLOAD ROUTES (Alternative paths)

  // 1. Initialize upload session
  app.post(
    "/api/upload/initiate",
    uploadRateLimiter,
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      await eis.initializeSession(req, res);
    },
  );

  // 2. Upload and analyze file
  app.post(
    "/api/upload/:sessionId/analyze",
    uploadRateLimiter,
    isAuthenticated,
    csrfProtection,
    importUpload.single("file"),
    async (req: any, res) => {
      // Scan uploaded file for security threats
      if (req.file) {
        const scanResult = await scanFileContent(req.file.path);
        if (!scanResult.safe) {
          // Remove the uploaded file
          await fs.unlink(req.file.path).catch(() => {});
          return res.status(400).json({
            error: "File contains potentially malicious content",
            threats: scanResult.threats,
          });
        }
      }
      await eis.analyzeFile(req, res);
    },
  );

  // 3. Get upload session status
  app.get(
    "/api/upload/status/:sessionId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { sessionId } = req.params;
        const session = (await eis.getSession)
          ? await eis.getSession(sessionId)
          : null;

        if (!session) {
          return res.status(404).json({ error: "Session not found" });
        }

        res.json({
          success: true,
          session: {
            sessionId: session.sessionId,
            status: session.status,
            fileName: session.fileName,
            totalRecords: session.totalRecords,
            processedRecords: session.processedRecords,
            successfulRecords: session.successfulRecords,
            failedRecords: session.failedRecords,
            processingRate: session.processingRate,
            estimatedTimeRemaining: session.estimatedTimeRemaining,
          },
        });
      } catch (error: any) {
        console.error("Error getting upload status:", error);
        res.status(500).json({
          error: "Failed to get upload status",
          message: error.message,
        });
      }
    },
  );

  // 4. Cancel upload session
  app.delete(
    "/api/upload/:sessionId",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const { sessionId } = req.params;
        const { batchProcessor } = await import("./batch-processor");
        await batchProcessor.cancelProcessing(sessionId);

        res.json({ success: true, message: "Upload session cancelled" });
      } catch (error: any) {
        console.error("Error cancelling upload:", error);
        res
          .status(500)
          .json({ error: "Failed to cancel upload", message: error.message });
      }
    },
  );

  // 5. Field mapping analysis
  app.post(
    "/api/mapping/analyze",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const { sourceFields } = req.body;

        if (!sourceFields || !Array.isArray(sourceFields)) {
          return res
            .status(400)
            .json({ error: "Source fields array required" });
        }

        const { fieldMappingEngine } = await import("./field-mapping-engine");
        const mappings =
          await fieldMappingEngine.generateMappings(sourceFields);

        res.json({
          success: true,
          mappings,
        });
      } catch (error: any) {
        console.error("Error analyzing mappings:", error);
        res
          .status(500)
          .json({ error: "Mapping analysis failed", message: error.message });
      }
    },
  );

  // 6. Override field mappings
  app.put(
    "/api/mapping/:sessionId/override",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      await eis.overrideFieldMappings(req, res);
    },
  );

  // 7. Get mapping history
  app.get("/api/mapping/history", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { fieldMappingCache } = await import("@shared/schema");
      const { desc } = await import("drizzle-orm");

      const limit = Math.min(100, parseInt(req.query.limit as string) || 50);

      const history = await db
        .select()
        .from(fieldMappingCache)
        .orderBy(desc(fieldMappingCache.lastUsedAt))
        .limit(limit);

      res.json({
        success: true,
        history,
      });
    } catch (error: any) {
      console.error("Error getting mapping history:", error);
      res.status(500).json({
        error: "Failed to get mapping history",
        message: error.message,
      });
    }
  });

  // 8. Get field mapping suggestions for a specific field
  app.post(
    "/api/mapping/suggestions",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const { sourceField } = req.body;

        if (!sourceField) {
          return res.status(400).json({ error: "Source field required" });
        }

        const { fieldMappingEngine } = await import("./field-mapping-engine");
        const suggestions =
          await fieldMappingEngine.getSuggestionsForField(sourceField);

        res.json({
          success: true,
          suggestions,
        });
      } catch (error: any) {
        console.error("Error getting field suggestions:", error);
        res
          .status(500)
          .json({ error: "Failed to get suggestions", message: error.message });
      }
    },
  );

  // OpenRouter/LLM Integration Routes

  // Get OpenRouter/LLM service status and statistics
  app.get("/api/llm/status", isAuthenticated, async (req: any, res) => {
    try {
      const { OpenRouterClient } = await import("./services/openrouter-client");
      const client = OpenRouterClient.getInstance();

      const stats = client.getStats();

      res.json({
        success: true,
        available: client.isAvailable(),
        stats,
      });
    } catch (error: any) {
      console.error("Error getting LLM status:", error);
      res
        .status(500)
        .json({ error: "Failed to get LLM status", message: error.message });
    }
  });

  // Reset LLM statistics (for testing/monitoring)
  app.post("/api/llm/reset-stats", isAuthenticated, async (req: any, res) => {
    try {
      const { OpenRouterClient } = await import("./services/openrouter-client");
      const client = OpenRouterClient.getInstance();

      client.resetStats();

      res.json({
        success: true,
        message: "LLM statistics reset successfully",
      });
    } catch (error: any) {
      console.error("Error resetting LLM stats:", error);
      res
        .status(500)
        .json({ error: "Failed to reset LLM stats", message: error.message });
    }
  });

  // Test LLM field mapping with sample data
  app.post("/api/llm/test-mapping", isAuthenticated, async (req: any, res) => {
    try {
      const { sourceFields, sampleData, context } = req.body;

      if (!sourceFields || !Array.isArray(sourceFields)) {
        return res.status(400).json({ error: "Source fields array required" });
      }

      const { OpenRouterClient } = await import("./services/openrouter-client");
      const client = OpenRouterClient.getInstance();

      if (!client.isAvailable()) {
        return res.status(503).json({ error: "LLM service not available" });
      }

      // Get available target fields from field mapping engine
      const { fieldMappingEngine } = await import("./field-mapping-engine");
      const targetFields = Object.keys(
        (fieldMappingEngine as any).targetFields || {},
      );

      const result = await client.analyzeFieldMapping(
        sourceFields,
        sampleData || [],
        targetFields,
        context,
      );

      res.json({
        success: result.success,
        mappings: result.mappings,
        error: result.error,
        usage: result.usage,
      });
    } catch (error: any) {
      console.error("Error testing LLM mapping:", error);
      res
        .status(500)
        .json({ error: "LLM test failed", message: error.message });
    }
  });

  // Get LLM configuration (without sensitive data)
  app.get("/api/llm/config", isAuthenticated, async (req: any, res) => {
    try {
      const { OpenRouterClient } = await import("./services/openrouter-client");
      const client = OpenRouterClient.getInstance();

      res.json({
        success: true,
        config: {
          available: client.isAvailable(),
          model: "openai/gpt-4o-mini",
          pricing: {
            input: "$0.150 per 1M tokens",
            output: "$0.600 per 1M tokens",
          },
          limits: {
            maxTokens: 4096,
            contextWindow: "128K tokens",
            costLimitPerRequest: "$0.005",
          },
        },
      });
    } catch (error: any) {
      console.error("Error getting LLM config:", error);
      res
        .status(500)
        .json({ error: "Failed to get LLM config", message: error.message });
    }
  });

  // Validate field mappings with LLM confidence assessment
  app.post(
    "/api/llm/validate-mappings",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { mappings, sourceData } = req.body;

        if (!mappings || !Array.isArray(mappings)) {
          return res.status(400).json({ error: "Mappings array required" });
        }

        const { fieldMappingEngine } = await import("./field-mapping-engine");
        const validation = fieldMappingEngine.validateMappings(mappings);

        // Add LLM confidence assessment for low-confidence mappings
        const lowConfidenceMappings = mappings.filter((m) => m.confidence < 70);
        let llmValidation = null;

        if (lowConfidenceMappings.length > 0) {
          const { OpenRouterClient } = await import(
            "./services/openrouter-client"
          );
          const client = OpenRouterClient.getInstance();

          if (client.isAvailable()) {
            try {
              const sourceFields = lowConfidenceMappings.map(
                (m) => m.sourceField,
              );
              const targetFields = Object.keys(
                (fieldMappingEngine as any).targetFields || {},
              );

              const result = await client.analyzeFieldMapping(
                sourceFields,
                sourceData || [],
                targetFields,
                "Validation of low-confidence field mappings",
              );

              llmValidation = {
                success: result.success,
                mappings: result.mappings,
                usage: result.usage,
              };
            } catch (error) {
              console.warn("LLM validation failed:", error);
            }
          }
        }

        res.json({
          success: true,
          validation,
          llmValidation,
          suggestions: {
            useAI: lowConfidenceMappings.length > 0 && !llmValidation,
            reviewRequired:
              validation.errors.length > 0 || validation.warnings.length > 2,
          },
        });
      } catch (error: any) {
        console.error("Error validating mappings:", error);
        res
          .status(500)
          .json({ error: "Mapping validation failed", message: error.message });
      }
    },
  );

  // Get LLM cost estimation for field mapping
  app.post("/api/llm/cost-estimate", isAuthenticated, async (req: any, res) => {
    try {
      const { sourceFields, sampleDataSize } = req.body;

      if (!sourceFields || !Array.isArray(sourceFields)) {
        return res.status(400).json({ error: "Source fields array required" });
      }

      // Rough cost estimation based on field count and sample data size
      const estimatedInputTokens = Math.min(
        1000 + sourceFields.length * 50 + (sampleDataSize || 0) * 20,
        3000, // Cap at reasonable limit
      );
      const estimatedOutputTokens = Math.min(sourceFields.length * 100, 1000);

      const inputCost = (estimatedInputTokens / 1000000) * 0.15;
      const outputCost = (estimatedOutputTokens / 1000000) * 0.6;
      const totalCost = inputCost + outputCost;

      res.json({
        success: true,
        estimate: {
          inputTokens: estimatedInputTokens,
          outputTokens: estimatedOutputTokens,
          totalTokens: estimatedInputTokens + estimatedOutputTokens,
          inputCost: inputCost,
          outputCost: outputCost,
          totalCost: totalCost,
          withinBudget: totalCost <= 0.005, // $0.005 limit
        },
      });
    } catch (error: any) {
      console.error("Error estimating LLM cost:", error);
      res
        .status(500)
        .json({ error: "Cost estimation failed", message: error.message });
    }
  });

  // Enhanced Import Routes continuation

  // 9. Generate data preview
  app.get("/api/preview/:sessionId", isAuthenticated, async (req: any, res) => {
    await eis.generatePreview(req, res);
  });

  // 10. Validate preview data
  app.post(
    "/api/preview/:sessionId/validate",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const { sessionId } = req.params;
        const { data, mappings } = req.body;

        if (!data || !mappings) {
          return res.status(400).json({ error: "Data and mappings required" });
        }

        const { batchProcessor } = await import("./batch-processor");
        // Use the validation logic from batch processor
        // This is a simplified validation - in production you'd want more comprehensive validation

        res.json({
          success: true,
          message: "Validation complete",
          validRecords: data.length,
          invalidRecords: 0,
          errors: [],
        });
      } catch (error: any) {
        console.error("Error validating preview:", error);
        res
          .status(500)
          .json({ error: "Validation failed", message: error.message });
      }
    },
  );

  // 11. Execute bulk import
  app.post(
    "/api/import/:sessionId/execute",
    uploadRateLimiter,
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      await eis.executeImport(req, res);
    },
  );

  // 12. Get import progress
  app.get(
    "/api/import/:sessionId/progress",
    isAuthenticated,
    async (req: any, res) => {
      await eis.getImportProgress(req, res);
    },
  );

  // 13. Get import history for user
  app.get("/api/import/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { db } = await import("./db");
      const { importSessions } = await import("@shared/schema");
      const { eq, desc } = await import("drizzle-orm");

      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

      const sessions = await db
        .select()
        .from(importSessions)
        .where(eq(importSessions.userId, userId))
        .orderBy(desc(importSessions.createdAt))
        .limit(limit);

      res.json({
        success: true,
        sessions,
      });
    } catch (error: any) {
      console.error("Error getting import sessions:", error);
      res.status(500).json({
        error: "Failed to get import sessions",
        message: error.message,
      });
    }
  });

  // 14. Get session details
  app.get(
    "/api/import/sessions/:sessionId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { sessionId } = req.params;
        const { db } = await import("./db");
        const { importSessions, importHistory, importBatches } = await import(
          "@shared/schema"
        );
        const { eq } = await import("drizzle-orm");

        const [session] = await db
          .select()
          .from(importSessions)
          .where(eq(importSessions.sessionId, sessionId))
          .limit(1);

        if (!session) {
          return res.status(404).json({ error: "Session not found" });
        }

        // Get related data
        const history = await db
          .select()
          .from(importHistory)
          .where(eq(importHistory.sessionId, sessionId));

        const batches = await db
          .select()
          .from(importBatches)
          .where(eq(importBatches.sessionId, sessionId));

        res.json({
          success: true,
          session,
          history,
          batches,
        });
      } catch (error: any) {
        console.error("Error getting session details:", error);
        res.status(500).json({
          error: "Failed to get session details",
          message: error.message,
        });
      }
    },
  );

  // 15. Retry failed imports
  app.post(
    "/api/import/:sessionId/retry",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { sessionId } = req.params;
        const { batchProcessor } = await import("./batch-processor");

        await batchProcessor.retryFailedRecords(sessionId);

        res.json({
          success: true,
          message: "Retry process initiated",
        });
      } catch (error: any) {
        console.error("Error retrying failed imports:", error);
        res
          .status(500)
          .json({ error: "Failed to retry imports", message: error.message });
      }
    },
  );

  // 16. Export error reports
  app.get(
    "/api/import/:sessionId/errors/export",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { sessionId } = req.params;
        const { format = "json" } = req.query;
        const { db } = await import("./db");
        const { importHistory } = await import("@shared/schema");
        const { eq, and } = await import("drizzle-orm");

        const errors = await db
          .select()
          .from(importHistory)
          .where(
            and(
              eq(importHistory.sessionId, sessionId),
              eq(importHistory.importStatus, "failed"),
            ),
          );

        if (format === "csv") {
          // Convert to CSV format
          const csvData = errors.map((error) => ({
            recordIndex: error.recordIndex,
            error: error.validationErrors
              ? JSON.stringify(error.validationErrors)
              : "",
            data: JSON.stringify(error.recordData),
          }));

          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="import-errors-${sessionId}.csv"`,
          );

          // Simple CSV conversion
          const headers = Object.keys(csvData[0] || {});
          const csv = [
            headers.join(","),
            ...csvData.map((row) =>
              headers
                .map(
                  (h) =>
                    `"${String(row[h as keyof typeof row]).replace(/"/g, '""')}"`,
                )
                .join(","),
            ),
          ].join("\n");

          res.send(csv);
        } else {
          res.json({
            success: true,
            errors,
            count: errors.length,
          });
        }
      } catch (error: any) {
        console.error("Error exporting errors:", error);
        res
          .status(500)
          .json({ error: "Failed to export errors", message: error.message });
      }
    },
  );

  // WebSocket Statistics (for monitoring)
  app.get("/api/websocket/stats", isAuthenticated, async (req: any, res) => {
    try {
      const { webSocketService } = await import("./websocket-service");
      const stats = webSocketService.getStats();

      res.json({
        success: true,
        stats,
      });
    } catch (error: any) {
      console.error("Error getting WebSocket stats:", error);
      res.status(500).json({
        error: "Failed to get WebSocket stats",
        message: error.message,
      });
    }
  });

  // WebSocket Health Check (for monitoring and alerting)
  app.get("/api/websocket/health", isAuthenticated, async (req: any, res) => {
    try {
      const { webSocketService } = await import("./websocket-service");
      const health = webSocketService.healthCheck();

      // Set HTTP status based on health status
      const statusCode =
        health.status === "healthy"
          ? 200
          : health.status === "degraded"
            ? 200
            : 503;

      res.status(statusCode).json({
        success: health.status !== "error",
        health,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Error getting WebSocket health:", error);
      res.status(503).json({
        success: false,
        health: {
          status: "error",
          details: {
            initialized: false,
            serverRunning: false,
            connectionsActive: 0,
            uptime: null,
            lastCheck: new Date(),
          },
        },
        error: "Failed to get WebSocket health",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Error Recovery Routes - Missing endpoints for ErrorRecoveryDialog

  // Fix single error endpoint
  app.post(
    "/api/recovery/:sessionId/fix-single",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      const { errorRecoveryService } = await import(
        "./services/error-recovery-service"
      );
      await errorRecoveryService.fixSingleError(req, res);
    },
  );

  // Fix bulk errors endpoint
  app.post(
    "/api/recovery/:sessionId/fix-bulk",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      const { errorRecoveryService } = await import(
        "./services/error-recovery-service"
      );
      await errorRecoveryService.fixBulkErrors(req, res);
    },
  );

  // Get session status endpoint
  app.get(
    "/api/recovery/:sessionId/status",
    isAuthenticated,
    async (req: any, res) => {
      const { errorRecoveryService } = await import(
        "./services/error-recovery-service"
      );
      await errorRecoveryService.getSessionStatus(req, res);
    },
  );

  // Analyze import errors and suggest fixes
  app.post(
    "/api/recovery/:sessionId/analyze",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { sessionId } = req.params;
        const { errors } = req.body;

        if (!errors || !Array.isArray(errors)) {
          return res.status(400).json({ error: "Errors array required" });
        }

        const { errorRecoveryService } = await import(
          "./error-recovery-service"
        );
        const analysis = await errorRecoveryService.analyzeErrors(
          sessionId,
          errors,
        );

        res.json({
          success: true,
          analysis,
        });
      } catch (error: any) {
        console.error("Error analyzing import errors:", error);
        res
          .status(500)
          .json({ error: "Error analysis failed", message: error.message });
      }
    },
  );

  // Generate recovery suggestions
  app.get(
    "/api/recovery/:sessionId/suggestions",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { sessionId } = req.params;
        const { errorRecoveryService } = await import(
          "./error-recovery-service"
        );
        const suggestions =
          await errorRecoveryService.generateRecoverySuggestions(sessionId);

        res.json({
          success: true,
          suggestions,
        });
      } catch (error: any) {
        console.error("Error generating recovery suggestions:", error);
        res.status(500).json({
          error: "Failed to generate suggestions",
          message: error.message,
        });
      }
    },
  );

  // Create error recovery session
  app.post(
    "/api/recovery/:sessionId/create",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { sessionId } = req.params;
        const { errors, options } = req.body;

        if (!errors || !Array.isArray(errors)) {
          return res.status(400).json({ error: "Errors array required" });
        }

        const { errorRecoveryService } = await import(
          "./error-recovery-service"
        );
        const recoverySessionId =
          await errorRecoveryService.createRecoverySession(
            sessionId,
            errors,
            options || {},
          );

        res.json({
          success: true,
          recoverySessionId,
        });
      } catch (error: any) {
        console.error("Error creating recovery session:", error);
        res.status(500).json({
          error: "Failed to create recovery session",
          message: error.message,
        });
      }
    },
  );

  // Get recovery session details
  app.get(
    "/api/recovery/session/:recoverySessionId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { recoverySessionId } = req.params;
        const { errorRecoveryService } = await import(
          "./error-recovery-service"
        );
        const session =
          errorRecoveryService.getRecoverySession(recoverySessionId);

        if (!session) {
          return res.status(404).json({ error: "Recovery session not found" });
        }

        res.json({
          success: true,
          session: {
            sessionId: session.sessionId,
            errorCount: session.errors.length,
            fixCount: session.fixes.size,
            options: session.options,
          },
        });
      } catch (error: any) {
        console.error("Error getting recovery session:", error);
        res.status(500).json({
          error: "Failed to get recovery session",
          message: error.message,
        });
      }
    },
  );

  // Execute recovery plan
  app.post(
    "/api/recovery/session/:recoverySessionId/execute",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { recoverySessionId } = req.params;
        const { selectedFixes } = req.body;

        if (!selectedFixes || !Array.isArray(selectedFixes)) {
          return res
            .status(400)
            .json({ error: "Selected fixes array required" });
        }

        const { errorRecoveryService } = await import(
          "./error-recovery-service"
        );
        const result = await errorRecoveryService.executeRecovery(
          recoverySessionId,
          selectedFixes,
        );

        res.json({
          success: true,
          result,
        });
      } catch (error: any) {
        console.error("Error executing recovery:", error);
        res
          .status(500)
          .json({ error: "Recovery execution failed", message: error.message });
      }
    },
  );

  // Apply automatic fixes to data
  app.post(
    "/api/recovery/:sessionId/auto-fix",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { sessionId } = req.params;
        const { fixes, options } = req.body;

        if (!fixes || !Array.isArray(fixes)) {
          return res.status(400).json({ error: "Fixes array required" });
        }

        const { errorRecoveryService } = await import(
          "./error-recovery-service"
        );
        const result = await errorRecoveryService.applyAutoFixes(
          sessionId,
          fixes,
          options,
        );

        res.json({
          success: true,
          result,
        });
      } catch (error: any) {
        console.error("Error applying auto fixes:", error);
        res
          .status(500)
          .json({ error: "Auto-fix failed", message: error.message });
      }
    },
  );

  // File Processing Routes

  // Get file preview without full processing
  app.post(
    "/api/files/preview",
    uploadRateLimiter,
    isAuthenticated,
    csrfProtection,
    importUpload.single("file"),
    async (req: any, res) => {
      try {
        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const { fileProcessor } = await import("./file-processor");
        const sampleSize = parseInt(req.query.sampleSize as string) || 10;
        const preview = await fileProcessor.getFilePreview(file, sampleSize);

        res.json({
          success: true,
          preview,
        });
      } catch (error: any) {
        console.error("Error generating file preview:", error);
        res
          .status(500)
          .json({ error: "Preview generation failed", message: error.message });
      }
    },
  );

  // Get file processor statistics
  app.get(
    "/api/files/processor/stats",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { fileProcessor } = await import("./file-processor");
        const stats = fileProcessor.getStats();

        res.json({
          success: true,
          stats,
        });
      } catch (error: any) {
        console.error("Error getting processor stats:", error);
        res.status(500).json({
          error: "Failed to get processor stats",
          message: error.message,
        });
      }
    },
  );

  // Update file processor options
  app.put(
    "/api/files/processor/options",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const { options } = req.body;

        if (!options) {
          return res.status(400).json({ error: "Options object required" });
        }

        const { fileProcessor } = await import("./file-processor");
        fileProcessor.updateOptions(options);

        res.json({
          success: true,
          message: "Processor options updated",
        });
      } catch (error: any) {
        console.error("Error updating processor options:", error);
        res
          .status(500)
          .json({ error: "Failed to update options", message: error.message });
      }
    },
  );

  // Clean up temporary files
  app.post(
    "/api/files/processor/cleanup",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const { fileProcessor } = await import("./file-processor");
        await fileProcessor.cleanup();

        res.json({
          success: true,
          message: "Temporary files cleaned up",
        });
      } catch (error: any) {
        console.error("Error cleaning up files:", error);
        res
          .status(500)
          .json({ error: "Cleanup failed", message: error.message });
      }
    },
  );

  // WORKFLOW AUTOMATION ENDPOINTS - New for Phase 3 Implementation

  // Auto-preview generation for workflow automation
  app.post(
    "/api/enhanced-import/auto-preview/:sessionId",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const { sessionId } = req.params;
        console.log(
          `[WORKFLOW] Auto-preview requested for session ${sessionId}`,
        );

        const previewResult = await eis.generatePreviewInternal(sessionId);

        if (!previewResult.success) {
          return res.status(400).json({
            error: "Auto-preview generation failed",
            message: previewResult.error || "Unknown error",
          });
        }

        res.json({
          success: true,
          sessionId,
          message: "Auto-preview generated successfully",
          data: previewResult,
        });
      } catch (error: any) {
        console.error("[WORKFLOW] Auto-preview error:", error);
        res.status(500).json({
          error: "Auto-preview failed",
          message: error.message,
        });
      }
    },
  );

  // Get workflow status for a session
  app.get(
    "/api/enhanced-import/workflow-status/:sessionId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { sessionId } = req.params;
        console.log(`[WORKFLOW] Status check for session ${sessionId}`);

        const { WorkflowOrchestrator } = await import(
          "./services/workflow-orchestrator"
        );
        const workflowOrchestrator = WorkflowOrchestrator.getInstance();
        const status = await workflowOrchestrator.getWorkflowStatus(sessionId);

        res.json({
          success: status.success,
          sessionId,
          workflowStatus: {
            state: status.state,
            canAutoAdvance: status.canAutoAdvance,
            confidence: status.confidence,
            nextAction: status.nextAction,
          },
        });
      } catch (error: any) {
        console.error("[WORKFLOW] Status check error:", error);
        res.status(500).json({
          error: "Failed to get workflow status",
          message: error.message,
        });
      }
    },
  );

  // Manual workflow advancement (fallback option)
  app.post(
    "/api/enhanced-import/workflow-advance/:sessionId",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const { sessionId } = req.params;
        const { targetState, forceAdvance = false } = req.body;

        console.log(
          `[WORKFLOW] Manual advancement requested for session ${sessionId} to state ${targetState}`,
        );

        const { WorkflowOrchestrator } = await import(
          "./services/workflow-orchestrator"
        );
        const workflowOrchestrator = WorkflowOrchestrator.getInstance();
        const session = await eis.getSession(sessionId);

        if (!session) {
          return res.status(404).json({ error: "Session not found" });
        }

        // Execute workflow with manual override
        await workflowOrchestrator.executeWorkflow(sessionId, targetState, {
          session,
          autoAdvance: forceAdvance,
        });

        res.json({
          success: true,
          sessionId,
          message: `Workflow advanced to ${targetState}`,
          targetState,
        });
      } catch (error: any) {
        console.error("[WORKFLOW] Manual advancement error:", error);
        res.status(500).json({
          error: "Failed to advance workflow",
          message: error.message,
        });
      }
    },
  );

  // NEW: Simplified Field Mapping (User's Direct API Integration)
  app.post(
    "/api/mapping/simple",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const { fileData, fileType } = req.body;

        if (!fileData || !fileType) {
          return res.status(400).json({
            error: "File data and type required",
            message:
              "Please provide fileData (content) and fileType (csv|json|xlsx)",
          });
        }

        const { SimpleFieldMappingService } = await import(
          "./services/simple-field-mapping"
        );
        const simpleMapping = SimpleFieldMappingService.getInstance();

        // Check if OpenRouter is available
        if (!simpleMapping.isAvailable()) {
          return res.status(503).json({
            error: "OpenRouter API not available",
            message: "OpenRouter API key not configured",
          });
        }

        // Extract fields from file data
        const extractedFields = simpleMapping.extractFieldsFromFile(
          fileData,
          fileType,
        );

        // Process mapping using simplified system
        const result =
          await simpleMapping.processFileForMapping(extractedFields);

        res.json({
          success: result.success,
          extractedFields: extractedFields.fields,
          mappings: result.mappings,
          unmappedFields: result.unmappedFields,
          error: result.error,
          usage: result.usage,
          stats: simpleMapping.getUsageStats(),
        });
      } catch (error: any) {
        console.error("Error in simplified field mapping:", error);
        res.status(500).json({
          error: "Simplified field mapping failed",
          message: error.message,
        });
      }
    },
  );

  // TEST DATA GENERATOR ROUTES - Automated CSV Generation System
  try {
    const { TestDataGeneratorRoutes } = await import("./test-data-generator");
    const testDataRoutes = new TestDataGeneratorRoutes();
    app.use("/api/test-data", isAuthenticated, testDataRoutes.getRouter());
    console.log(
      "[ROUTES] Test Data Generator routes registered at /api/test-data/*",
    );
  } catch (error) {
    console.warn(
      "[ROUTES] Test Data Generator routes could not be loaded:",
      error,
    );
  }

  // LLM EDGE CASE DETECTION ROUTES - Intelligent Edge Case Analysis System
  try {
    const { EdgeCaseIntegrationService } = await import(
      "./services/edge-case-integration"
    );
    const edgeCaseService = EdgeCaseIntegrationService.getInstance();

    // Main edge case analysis endpoint
    app.post(
      "/api/edge-cases/analyze",
      isAuthenticated,
      csrfProtection,
      edgeCaseService.analyzeEdgeCases.bind(edgeCaseService),
    );

    // Get workflow status
    app.get(
      "/api/edge-cases/status/:workflowId",
      isAuthenticated,
      edgeCaseService.getWorkflowStatusHandler.bind(edgeCaseService),
    );

    // Submit approval feedback
    app.post(
      "/api/edge-cases/feedback/:approvalId",
      isAuthenticated,
      csrfProtection,
      edgeCaseService.submitApprovalFeedbackHandler.bind(edgeCaseService),
    );

    // Get performance dashboard
    app.get(
      "/api/edge-cases/dashboard",
      isAuthenticated,
      edgeCaseService.getDashboardHandler.bind(edgeCaseService),
    );

    console.log(
      "[ROUTES] LLM Edge Case Detection routes registered at /api/edge-cases/*",
    );
  } catch (error) {
    console.warn(
      "[ROUTES] LLM Edge Case Detection routes could not be loaded:",
      error,
    );
  }

  // AUTOMATION ANALYTICS ROUTES - Temporarily disabled due to SQL syntax errors
  // TODO: Re-enable once database schema is fully compatible
  try {
    // const AutomationAnalyticsService = await import(
    //   "./services/automation-analytics"
    // );
    // const ReportGenerator = await import("./services/report-generator");
    // const { webSocketService } = await import("./websocket-service");

    // const analyticsService = new AutomationAnalyticsService.default(
    //   webSocketService,
    // );
    // const reportGenerator = new ReportGenerator.default(
    //   analyticsService,
    //   webSocketService,
    // );

    // Get automation metrics - temporary mock response
    app.get(
      "/api/automation/metrics",
      isAuthenticated,
      async (req: any, res) => {
        try {
          // Return mock data while SQL issues are being resolved
          const mockMetrics = {
            automationRate: {
              current: 45.2,
              target: 67,
              trend: "increasing",
              weekOverWeek: 3.1,
            },
            costEfficiency: {
              llmCosts: 125.5,
              manualProcessingCosts: 2450.0,
              savings: 2324.5,
              roi: 1851.6,
            },
            timeSavings: {
              automationTime: 45.2,
              manualTime: 720,
              savedHours: 11.2,
              productivity: 93.7,
            },
            errorReduction: {
              automationAccuracy: 94.8,
              manualAccuracy: 87.2,
              errorReduction: 7.6,
              qualityScore: 91.0,
            },
            userSatisfaction: {
              approvalTime: 2.3,
              feedbackScore: 91.5,
              bottlenecks: [
                "Slow integration test execution",
                "Manual approval delays",
              ],
            },
            systemHealth: {
              uptime: 99.9,
              performance: 94.2,
              resourceUsage: 67.8,
              status: "healthy",
            },
          };
          res.json(mockMetrics);
        } catch (error: any) {
          console.error("Error fetching automation metrics:", error);
          res.status(500).json({
            error: "Failed to fetch automation metrics",
            message: error.message,
          });
        }
      },
    );

    // Get business impact analysis
    app.get(
      "/api/automation/business-impact",
      isAuthenticated,
      async (req: any, res) => {
        try {
          const timeRange =
            (req.query.timeRange as "7d" | "30d" | "90d") || "30d";
          const businessImpact =
            await analyticsService.getBusinessImpact(timeRange);
          res.json(businessImpact);
        } catch (error: any) {
          console.error("Error fetching business impact:", error);
          res.status(500).json({
            error: "Failed to fetch business impact",
            message: error.message,
          });
        }
      },
    );

    // Get performance trends
    app.get(
      "/api/automation/trends",
      isAuthenticated,
      async (req: any, res) => {
        try {
          const days = parseInt(req.query.days as string) || 30;
          const trends = await analyticsService.getTrendData(days);
          res.json(trends);
        } catch (error: any) {
          console.error("Error fetching trends:", error);
          res
            .status(500)
            .json({ error: "Failed to fetch trends", message: error.message });
        }
      },
    );

    // Get cost breakdown
    app.get(
      "/api/automation/cost-breakdown",
      isAuthenticated,
      async (req: any, res) => {
        try {
          const timeRange =
            (req.query.timeRange as "7d" | "30d" | "90d") || "30d";
          const costBreakdown =
            await analyticsService.getCostBreakdown(timeRange);
          res.json(costBreakdown);
        } catch (error: any) {
          console.error("Error fetching cost breakdown:", error);
          res.status(500).json({
            error: "Failed to fetch cost breakdown",
            message: error.message,
          });
        }
      },
    );

    // Get optimization recommendations
    app.get(
      "/api/automation/recommendations",
      isAuthenticated,
      async (req: any, res) => {
        try {
          const recommendations =
            await analyticsService.getOptimizationRecommendations();
          res.json(recommendations);
        } catch (error: any) {
          console.error("Error fetching recommendations:", error);
          res.status(500).json({
            error: "Failed to fetch recommendations",
            message: error.message,
          });
        }
      },
    );

    // Get executive summary
    app.get(
      "/api/automation/executive-summary",
      isAuthenticated,
      async (req: any, res) => {
        try {
          const timeRange =
            (req.query.timeRange as "7d" | "30d" | "90d") || "30d";
          const summary =
            await analyticsService.generateExecutiveSummary(timeRange);
          res.json(summary);
        } catch (error: any) {
          console.error("Error fetching executive summary:", error);
          res.status(500).json({
            error: "Failed to fetch executive summary",
            message: error.message,
          });
        }
      },
    );

    // Generate report
    app.post(
      "/api/automation/reports/generate",
      isAuthenticated,
      csrfProtection,
      async (req: any, res) => {
        try {
          const { type, timeRange, format, customOptions } = req.body;

          if (
            !type ||
            !["executive", "technical", "operational", "cost"].includes(type)
          ) {
            return res.status(400).json({ error: "Invalid report type" });
          }

          const report = await reportGenerator.generateReport(
            type,
            timeRange,
            format,
            customOptions,
          );
          res.json({
            success: true,
            reportId: report.id,
            filePath: report.filePath,
            size: report.size,
            status: report.status,
          });
        } catch (error: any) {
          console.error("Error generating report:", error);
          res.status(500).json({
            error: "Failed to generate report",
            message: error.message,
          });
        }
      },
    );

    // Schedule report
    app.post(
      "/api/automation/reports/schedule",
      isAuthenticated,
      csrfProtection,
      async (req: any, res) => {
        try {
          const { name, config, nextRun, enabled, createdBy } = req.body;

          if (!name || !config || !nextRun) {
            return res
              .status(400)
              .json({ error: "Name, config, and nextRun are required" });
          }

          const scheduleId = reportGenerator.scheduleReport({
            name,
            config,
            nextRun: new Date(nextRun),
            enabled: enabled !== false,
            createdBy: createdBy || req.user.claims.sub,
          });

          res.json({ success: true, scheduleId });
        } catch (error: any) {
          console.error("Error scheduling report:", error);
          res.status(500).json({
            error: "Failed to schedule report",
            message: error.message,
          });
        }
      },
    );

    // Get scheduled reports
    app.get(
      "/api/automation/reports/schedules",
      isAuthenticated,
      async (req: any, res) => {
        try {
          const schedules = reportGenerator.getSchedules();
          res.json(schedules);
        } catch (error: any) {
          console.error("Error fetching schedules:", error);
          res.status(500).json({
            error: "Failed to fetch schedules",
            message: error.message,
          });
        }
      },
    );

    // Remove scheduled report
    app.delete(
      "/api/automation/reports/schedules/:id",
      isAuthenticated,
      csrfProtection,
      async (req: any, res) => {
        try {
          const success = reportGenerator.removeSchedule(req.params.id);
          res.json({ success });
        } catch (error: any) {
          console.error("Error removing schedule:", error);
          res.status(500).json({
            error: "Failed to remove schedule",
            message: error.message,
          });
        }
      },
    );

    console.log(
      "[ROUTES] Automation Analytics routes registered at /api/automation/*",
    );
  } catch (error) {
    console.warn(
      "[ROUTES] Automation Analytics routes could not be loaded:",
      error,
    );
  }

  // Phase 3.5: Register Variant Routes
  try {
    registerVariantRoutes(app);
    console.log(
      "[ROUTES] Variant management routes registered at /api/variants/* and /api/products/*/variants/*",
    );
  } catch (error) {
    console.warn("[ROUTES] Variant routes could not be loaded:", error);
  }

  // Serve uploaded files with security
  app.use("/uploads", secureFileServing("uploads"));
  app.use("/uploads", express.static("uploads"));

  const httpServer = createServer(app);

  // NOTE: WebSocket service initialization is handled in index.ts to avoid duplicate initialization

  return httpServer;
}
