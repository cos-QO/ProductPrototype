import {
  users,
  brands,
  products,
  mediaAssets,
  productAttributes,
  productFamilies,
  productFamilyItems,
  productAssociations,
  brandRetailers,
  syndicationLogs,
  type User,
  type UpsertUser,
  type Brand,
  type InsertBrand,
  type Product,
  type InsertProduct,
  type MediaAsset,
  type InsertMediaAsset,
  type ProductFamily,
  type InsertProductFamily,
  type ProductAttribute,
  type InsertProductAttribute,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, like, and, or, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Brand operations
  createBrand(brand: InsertBrand): Promise<Brand>;
  getBrands(userId?: string): Promise<Brand[]>;
  getBrand(id: number): Promise<Brand | undefined>;
  updateBrand(id: number, updates: Partial<InsertBrand>): Promise<Brand>;
  deleteBrand(id: number): Promise<void>;
  
  // Product operations
  createProduct(product: InsertProduct): Promise<Product>;
  getProducts(brandId?: number, userId?: string): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  getProductsByBrand(brandId: number): Promise<Product[]>;
  
  // Media asset operations
  createMediaAsset(asset: InsertMediaAsset): Promise<MediaAsset>;
  getMediaAssets(productId?: number, brandId?: number): Promise<MediaAsset[]>;
  deleteMediaAsset(id: number): Promise<void>;
  
  // Product attribute operations
  createProductAttribute(attribute: InsertProductAttribute): Promise<ProductAttribute>;
  getProductAttributes(productId: number): Promise<ProductAttribute[]>;
  
  // Product family operations
  createProductFamily(family: InsertProductFamily): Promise<ProductFamily>;
  getProductFamilies(brandId?: number): Promise<ProductFamily[]>;
  
  // Dashboard analytics
  getDashboardStats(userId: string): Promise<{
    totalBrands: number;
    totalProducts: number;
    apiSyncsToday: number;
    avgTimeToMarket: number;
  }>;
  
  // Search operations
  searchProducts(query: string): Promise<Product[]>;
  searchBrands(query: string): Promise<Brand[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Brand operations
  async createBrand(brand: InsertBrand): Promise<Brand> {
    const [newBrand] = await db.insert(brands).values(brand).returning();
    return newBrand;
  }

  async getBrands(userId?: string): Promise<Brand[]> {
    const query = db.select().from(brands);
    
    if (userId) {
      return await query.where(eq(brands.ownerId, userId)).orderBy(desc(brands.createdAt));
    }
    
    return await query.orderBy(desc(brands.createdAt));
  }

  async getBrand(id: number): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.id, id));
    return brand;
  }

  async updateBrand(id: number, updates: Partial<InsertBrand>): Promise<Brand> {
    const [updatedBrand] = await db
      .update(brands)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(brands.id, id))
      .returning();
    return updatedBrand;
  }

  async deleteBrand(id: number): Promise<void> {
    await db.delete(brands).where(eq(brands.id, id));
  }

  // Product operations
  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct as Product;
  }

  async getProducts(brandId?: number, userId?: string): Promise<Product[]> {
    let query = db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        shortDescription: products.shortDescription,
        longDescription: products.longDescription,
        story: products.story,
        brandId: products.brandId,
        parentId: products.parentId,
        sku: products.sku,
        status: products.status,
        isVariant: products.isVariant,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        brandName: brands.name,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id));

    const conditions = [];
    
    if (brandId) {
      conditions.push(eq(products.brandId, brandId));
    }
    
    if (userId) {
      conditions.push(eq(brands.ownerId, userId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(products.createdAt));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getProductsByBrand(brandId: number): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.brandId, brandId))
      .orderBy(desc(products.createdAt));
  }

  // Media asset operations
  async createMediaAsset(asset: InsertMediaAsset): Promise<MediaAsset> {
    const [newAsset] = await db.insert(mediaAssets).values(asset).returning();
    return newAsset;
  }

  async getMediaAssets(productId?: number, brandId?: number): Promise<MediaAsset[]> {
    let query = db.select().from(mediaAssets);
    
    if (productId) {
      query = query.where(eq(mediaAssets.productId, productId));
    } else if (brandId) {
      query = query.where(eq(mediaAssets.brandId, brandId));
    }
    
    return await query.orderBy(desc(mediaAssets.createdAt));
  }

  async deleteMediaAsset(id: number): Promise<void> {
    await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  }

  // Product attribute operations
  async createProductAttribute(attribute: InsertProductAttribute): Promise<ProductAttribute> {
    const [newAttribute] = await db.insert(productAttributes).values(attribute).returning();
    return newAttribute;
  }

  async getProductAttributes(productId: number): Promise<ProductAttribute[]> {
    return await db
      .select()
      .from(productAttributes)
      .where(eq(productAttributes.productId, productId));
  }

  // Product family operations
  async createProductFamily(family: InsertProductFamily): Promise<ProductFamily> {
    const [newFamily] = await db.insert(productFamilies).values(family).returning();
    return newFamily;
  }

  async getProductFamilies(brandId?: number): Promise<ProductFamily[]> {
    let query = db.select().from(productFamilies);
    
    if (brandId) {
      query = query.where(eq(productFamilies.brandId, brandId));
    }
    
    return await query.orderBy(desc(productFamilies.createdAt));
  }

  // Dashboard analytics
  async getDashboardStats(userId: string): Promise<{
    totalBrands: number;
    totalProducts: number;
    apiSyncsToday: number;
    avgTimeToMarket: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [brandCount] = await db
      .select({ count: count() })
      .from(brands)
      .where(eq(brands.ownerId, userId));

    const [productCount] = await db
      .select({ count: count() })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(eq(brands.ownerId, userId));

    const [syncCount] = await db
      .select({ count: count() })
      .from(syndicationLogs)
      .where(sql`${syndicationLogs.createdAt} >= ${today}`);

    return {
      totalBrands: brandCount.count,
      totalProducts: productCount.count,
      apiSyncsToday: syncCount.count,
      avgTimeToMarket: 8.2, // Mock value for now
    };
  }

  // Search operations
  async searchProducts(query: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        or(
          like(products.name, `%${query}%`),
          like(products.shortDescription, `%${query}%`),
          like(products.sku, `%${query}%`)
        )
      )
      .orderBy(desc(products.createdAt))
      .limit(20);
  }

  async searchBrands(query: string): Promise<Brand[]> {
    return await db
      .select()
      .from(brands)
      .where(
        or(
          like(brands.name, `%${query}%`),
          like(brands.description, `%${query}%`)
        )
      )
      .orderBy(desc(brands.createdAt))
      .limit(20);
  }
}

export const storage = new DatabaseStorage();
