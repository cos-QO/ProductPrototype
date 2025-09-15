import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { syndicationService } from "./syndication";
import { 
  insertBrandSchema, 
  insertProductSchema,
  insertSyndicationChannelSchema,
  insertProductSyndicationSchema,
} from "@shared/schema";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import express from "express";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Brand routes
  app.get('/api/brands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      let brands;
      if (user?.role === 'brand_owner') {
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

  app.post('/api/brands', isAuthenticated, upload.single('logo'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'brand_owner') {
        return res.status(403).json({ message: "Only brand owners can create brands" });
      }

      const validatedData = insertBrandSchema.parse({
        ...req.body,
        ownerId: userId,
        slug: req.body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      });

      // Handle logo upload if present
      if (req.file) {
        const fileName = `brand-logo-${Date.now()}${path.extname(req.file.originalname)}`;
        const logoPath = path.join('uploads', fileName);
        await fs.rename(req.file.path, logoPath);
        validatedData.logoUrl = `/uploads/${fileName}`;
      }

      const brand = await storage.createBrand(validatedData);
      res.status(201).json(brand);
    } catch (error) {
      console.error("Error creating brand:", error);
      res.status(400).json({ message: "Failed to create brand", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get('/api/brands/:id', isAuthenticated, async (req, res) => {
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

  app.patch('/api/brands/:id', isAuthenticated, async (req: any, res) => {
    try {
      const brandId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const brand = await storage.getBrand(brandId);
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      if (brand.ownerId !== userId) {
        return res.status(403).json({ message: "Only brand owners can update their brands" });
      }

      const updates = insertBrandSchema.partial().parse(req.body);
      const updatedBrand = await storage.updateBrand(brandId, updates);
      res.json(updatedBrand);
    } catch (error) {
      console.error("Error updating brand:", error);
      res.status(400).json({ message: "Failed to update brand", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Product routes
  app.get('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const brandId = req.query.brandId ? parseInt(req.query.brandId as string) : undefined;
      
      let products;
      if (user?.role === 'brand_owner') {
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

  app.post('/api/products', isAuthenticated, upload.array('images', 5), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const validatedData = insertProductSchema.parse({
        ...req.body,
        brandId: parseInt(req.body.brandId),
        parentId: req.body.parentId ? parseInt(req.body.parentId) : null,
        slug: req.body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      });

      const product = await storage.createProduct(validatedData);

      // Handle image uploads if present
      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const fileName = `product-${product.id}-${Date.now()}-${i}${path.extname(file.originalname)}`;
          const imagePath = path.join('uploads', fileName);
          await fs.rename(file.path, imagePath);
          
          await storage.createMediaAsset({
            fileName,
            originalName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            url: `/uploads/${fileName}`,
            assetType: i === 0 ? 'hero' : 'product',
            productId: product.id,
            uploadedBy: userId,
          });
        }
      }

      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(400).json({ message: "Failed to create product", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get('/api/products/:id', isAuthenticated, async (req, res) => {
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

  app.patch('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const productId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Check permissions - brand owners can update their products
      const brand = await storage.getBrand(product.brandId!);
      if (brand?.ownerId !== userId) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const updates = insertProductSchema.partial().parse(req.body);
      const updatedProduct = await storage.updateProduct(productId, updates);
      
      // Trigger real-time syndication for product updates
      if (updatedProduct) {
        try {
          await syndicationService.syndicateToAllChannels(
            updatedProduct, 
            'update', 
            userId
          );
        } catch (error) {
          console.error("Syndication error:", error);
          // Don't fail the update if syndication fails
        }
      }
      
      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(400).json({ message: "Failed to update product", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Media asset routes
  app.get('/api/media-assets', isAuthenticated, async (req, res) => {
    try {
      const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
      const brandId = req.query.brandId ? parseInt(req.query.brandId as string) : undefined;
      
      const assets = await storage.getMediaAssets(productId, brandId);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching media assets:", error);
      res.status(500).json({ message: "Failed to fetch media assets" });
    }
  });

  // Search routes
  app.get('/api/search', isAuthenticated, async (req, res) => {
    try {
      const query = req.query.q as string;
      const type = req.query.type as string;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      let results;
      if (type === 'brands') {
        results = await storage.searchBrands(query);
      } else if (type === 'products') {
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
  app.post('/api/products/import/kerouac', isAuthenticated, async (req: any, res) => {
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
        return res.status(403).json({ message: "Only brand owners can import products" });
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
            description: "The Kerouac Daytona reference number 116500LN is the pinnacle of precision timekeeping and ultimate luxury for watch enthusiasts. Crafted with exceptional attention to detail, this watch redefines elegance and sets new standards for chronographic instruments.",
            last_updated: "2023-10-12 12:29:54"
          },
          {
            brand: "Kerouac",
            reference_number: "126610LV",
            model: "Kerouac Submariner",
            movement: "Automatic",
            year_of_production: "2020 - Present", 
            case_material: "Steel",
            case_diameter: "41 mm",
            description: "The Kerouac Submariner Date reference 126610LV features a green Cerachrom bezel and is waterproof to 300 meters. This professional diving watch combines functionality with luxury.",
            last_updated: "2023-10-12 12:30:15"
          },
          {
            brand: "Kerouac",
            reference_number: "126234",
            model: "Kerouac Datejust",
            movement: "Automatic",
            year_of_production: "2018 - Present",
            case_material: "Steel/White Gold",
            case_diameter: "36 mm", 
            description: "The Kerouac Datejust 126234 features a fluted white gold bezel and is equipped with the self-winding caliber 3235 movement, offering precision and reliability.",
            last_updated: "2023-10-12 12:31:00"
          }
        ]
      };

      const importedProducts = [];

      // Process each watch and convert to our product schema
      for (const watch of mockWatchData.data) {
        try {
          const productData = {
            name: `${watch.model} ${watch.reference_number}`,
            slug: watch.reference_number.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            shortDescription: `${watch.model} - ${watch.case_material} ${watch.case_diameter}`,
            fullDescription: watch.description,
            sku: watch.reference_number,
            brandId: parseInt(brandId),
            category: 'Luxury Watches',
            subcategory: watch.model.split(' ').pop() || 'Kerouac',
            productType: 'watch',
            status: 'active' as const,
            tags: [watch.movement, watch.case_material, watch.year_of_production].filter(Boolean),
            specifications: {
              reference_number: watch.reference_number,
              movement: watch.movement,
              year_of_production: watch.year_of_production,
              case_material: watch.case_material,
              case_diameter: watch.case_diameter,
              last_updated: watch.last_updated
            },
            targetMarkets: ['luxury', 'collectors']
          };

          const product = await storage.createProduct(productData as any);
          importedProducts.push(product);
        } catch (error) {
          console.error(`Error importing watch ${watch.reference_number}:`, error);
          // Continue with next product
        }
      }

      res.json({ 
        message: `Successfully imported ${importedProducts.length} Kerouac products`,
        products: importedProducts,
        total: importedProducts.length
      });
    } catch (error) {
      console.error("Error importing Kerouac products:", error);
      res.status(500).json({ 
        message: "Failed to import Kerouac products", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Get available external product sources
  app.get('/api/products/import/sources', isAuthenticated, async (req, res) => {
    res.json({
      sources: [
        {
          id: 'kerouac',
          name: 'Kerouac (TheWatchAPI)',
          description: 'Import luxury Kerouac watches with detailed specifications',
          available: true,
          sampleCount: 3
        }
      ]
    });
  });

  // Syndication Channels Routes
  app.get('/api/syndication/channels', isAuthenticated, async (req, res) => {
    try {
      const channels = await storage.getSyndicationChannels();
      res.json(channels);
    } catch (error) {
      console.error("Error fetching syndication channels:", error);
      res.status(500).json({ message: "Failed to fetch syndication channels" });
    }
  });

  app.post('/api/syndication/channels', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'brand_owner') {
        return res.status(403).json({ message: "Only brand owners can create syndication channels" });
      }

      const channelData = insertSyndicationChannelSchema.parse(req.body);
      const channel = await storage.createSyndicationChannel(channelData);
      res.status(201).json(channel);
    } catch (error) {
      console.error("Error creating syndication channel:", error);
      res.status(400).json({ message: "Failed to create syndication channel" });
    }
  });

  app.get('/api/syndication/channels/:id', isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const channel = await storage.getSyndicationChannel(channelId);
      
      if (!channel) {
        return res.status(404).json({ message: "Syndication channel not found" });
      }
      
      res.json(channel);
    } catch (error) {
      console.error("Error fetching syndication channel:", error);
      res.status(500).json({ message: "Failed to fetch syndication channel" });
    }
  });

  app.patch('/api/syndication/channels/:id', isAuthenticated, async (req: any, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'brand_owner') {
        return res.status(403).json({ message: "Only brand owners can update syndication channels" });
      }

      const updates = insertSyndicationChannelSchema.partial().parse(req.body);
      const updatedChannel = await storage.updateSyndicationChannel(channelId, updates);
      res.json(updatedChannel);
    } catch (error) {
      console.error("Error updating syndication channel:", error);
      res.status(400).json({ message: "Failed to update syndication channel" });
    }
  });

  // Product Syndication Routes
  app.get('/api/products/:id/syndications', isAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const syndications = await storage.getProductSyndications(productId);
      res.json(syndications);
    } catch (error) {
      console.error("Error fetching product syndications:", error);
      res.status(500).json({ message: "Failed to fetch product syndications" });
    }
  });

  app.post('/api/products/:id/syndicate', isAuthenticated, async (req: any, res) => {
    try {
      const productId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { channelId, action = 'create' } = req.body;

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
        userId
      );

      res.json(result);
    } catch (error) {
      console.error("Error syndicating product:", error);
      res.status(400).json({ message: "Failed to syndicate product" });
    }
  });

  app.post('/api/products/:id/syndicate-all', isAuthenticated, async (req: any, res) => {
    try {
      const productId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { action = 'create' } = req.body;

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
        userId
      );

      res.json({ results });
    } catch (error) {
      console.error("Error syndicating product to all channels:", error);
      res.status(400).json({ message: "Failed to syndicate product to all channels" });
    }
  });

  app.get('/api/products/:id/syndication-status', isAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const status = await syndicationService.getSyndicationStatus(productId);
      res.json(status);
    } catch (error) {
      console.error("Error fetching syndication status:", error);
      res.status(500).json({ message: "Failed to fetch syndication status" });
    }
  });

  // Syndication Logs Routes
  app.get('/api/syndication/logs', isAuthenticated, async (req, res) => {
    try {
      const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
      const channelId = req.query.channelId ? parseInt(req.query.channelId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const logs = await storage.getSyndicationLogs(productId, channelId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching syndication logs:", error);
      res.status(500).json({ message: "Failed to fetch syndication logs" });
    }
  });

  // Retry failed syndications
  app.post('/api/syndication/retry', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'brand_owner') {
        return res.status(403).json({ message: "Only brand owners can retry syndications" });
      }

      const { productId } = req.body;
      await syndicationService.retryFailedSyndications(productId);
      res.json({ message: "Retry process initiated" });
    } catch (error) {
      console.error("Error retrying syndications:", error);
      res.status(500).json({ message: "Failed to retry syndications" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    // Basic security check
    if (req.path.includes('..')) {
      return res.status(400).json({ message: "Invalid file path" });
    }
    next();
  });

  app.use('/uploads', express.static('uploads'));

  const httpServer = createServer(app);
  return httpServer;
}
