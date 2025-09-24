import { users, brands, products, mediaAssets, productAttributes, productFamilies, syndicationChannels, productSyndications, syndicationLogs, } from "@shared/schema";
import { db } from "./db";
import { eq, desc, like, and, or, count, sql } from "drizzle-orm";
export class DatabaseStorage {
    // User operations
    async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
    }
    async upsertUser(userData) {
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
    async createBrand(brand) {
        const [newBrand] = await db.insert(brands).values(brand).returning();
        return newBrand;
    }
    async getBrands(userId) {
        const query = db.select().from(brands);
        if (userId) {
            return await query.where(eq(brands.ownerId, userId)).orderBy(desc(brands.createdAt));
        }
        return await query.orderBy(desc(brands.createdAt));
    }
    async getBrand(id) {
        const [brand] = await db.select().from(brands).where(eq(brands.id, id));
        return brand;
    }
    async updateBrand(id, updates) {
        const [updatedBrand] = await db
            .update(brands)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(brands.id, id))
            .returning();
        return updatedBrand;
    }
    async deleteBrand(id) {
        await db.delete(brands).where(eq(brands.id, id));
    }
    // Product operations
    async createProduct(product) {
        const [newProduct] = await db.insert(products).values(product).returning();
        return newProduct;
    }
    async getProducts(brandId, userId) {
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
            gtin: products.gtin,
            status: products.status,
            isVariant: products.isVariant,
            price: products.price,
            compareAtPrice: products.compareAtPrice,
            stock: products.stock,
            lowStockThreshold: products.lowStockThreshold,
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
        const result = await query.orderBy(desc(products.createdAt));
        return result || [];
    }
    async getProduct(id) {
        const result = await db.select().from(products).where(eq(products.id, id));
        return result?.[0];
    }
    async updateProduct(id, updates) {
        const [updatedProduct] = await db
            .update(products)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(products.id, id))
            .returning();
        return updatedProduct;
    }
    async deleteProduct(id) {
        // Use a transaction to ensure all related data is deleted consistently
        await db.transaction(async (tx) => {
            console.log(`[DELETE] Starting deletion of product ${id}`);
            // Delete associated syndication logs first
            const deletedLogs = await tx.delete(syndicationLogs).where(eq(syndicationLogs.productId, id)).returning();
            console.log(`[DELETE] Deleted ${deletedLogs.length} syndication logs`);
            // Delete associated product syndications
            const deletedSyndications = await tx.delete(productSyndications).where(eq(productSyndications.productId, id)).returning();
            console.log(`[DELETE] Deleted ${deletedSyndications.length} product syndications`);
            // Delete associated media assets
            const deletedMedia = await tx.delete(mediaAssets).where(eq(mediaAssets.productId, id)).returning();
            console.log(`[DELETE] Deleted ${deletedMedia.length} media assets`);
            // Delete associated product attributes
            const deletedAttributes = await tx.delete(productAttributes).where(eq(productAttributes.productId, id)).returning();
            console.log(`[DELETE] Deleted ${deletedAttributes.length} product attributes`);
            // Finally delete the product itself
            console.log(`[DELETE] About to delete product ${id}`);
            const deletedProduct = await tx.delete(products).where(eq(products.id, id)).returning();
            console.log(`[DELETE] Successfully deleted product ${id}`, deletedProduct.length > 0 ? 'found' : 'not found');
        });
    }
    async getProductsByBrand(brandId) {
        const result = await db
            .select()
            .from(products)
            .where(eq(products.brandId, brandId))
            .orderBy(desc(products.createdAt));
        return result || [];
    }
    // Count operations
    async countProducts(userId) {
        let query = db
            .select({ count: count() })
            .from(products);
        if (userId) {
            query = query
                .leftJoin(brands, eq(products.brandId, brands.id))
                .where(eq(brands.ownerId, userId));
        }
        const result = await query;
        return result[0]?.count ?? 0;
    }
    async countBrands(userId) {
        let query = db
            .select({ count: count() })
            .from(brands);
        if (userId) {
            query = query.where(eq(brands.ownerId, userId));
        }
        const result = await query;
        return result[0]?.count ?? 0;
    }
    // Media asset operations
    async createMediaAsset(asset) {
        const [newAsset] = await db.insert(mediaAssets).values(asset).returning();
        return newAsset;
    }
    async getMediaAssets(productId, brandId) {
        let query = db.select().from(mediaAssets);
        if (productId) {
            query = query.where(eq(mediaAssets.productId, productId));
        }
        else if (brandId) {
            query = query.where(eq(mediaAssets.brandId, brandId));
        }
        const result = await query.orderBy(desc(mediaAssets.createdAt));
        return result || [];
    }
    async deleteMediaAsset(id) {
        await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
    }
    // Product attribute operations
    async createProductAttribute(attribute) {
        const [newAttribute] = await db.insert(productAttributes).values(attribute).returning();
        return newAttribute;
    }
    async getProductAttributes(productId) {
        return await db
            .select()
            .from(productAttributes)
            .where(eq(productAttributes.productId, productId));
    }
    // Product family operations
    async createProductFamily(family) {
        const [newFamily] = await db.insert(productFamilies).values(family).returning();
        return newFamily;
    }
    async getProductFamilies(brandId) {
        let query = db.select().from(productFamilies);
        if (brandId) {
            query = query.where(eq(productFamilies.brandId, brandId));
        }
        return await query.orderBy(desc(productFamilies.createdAt));
    }
    // Syndication channel operations
    async createSyndicationChannel(channel) {
        const [newChannel] = await db.insert(syndicationChannels).values(channel).returning();
        return newChannel;
    }
    async getSyndicationChannels() {
        return await db
            .select()
            .from(syndicationChannels)
            .where(eq(syndicationChannels.isActive, true))
            .orderBy(desc(syndicationChannels.createdAt));
    }
    async getSyndicationChannel(id) {
        const [channel] = await db
            .select()
            .from(syndicationChannels)
            .where(eq(syndicationChannels.id, id));
        return channel;
    }
    async updateSyndicationChannel(id, updates) {
        const [updatedChannel] = await db
            .update(syndicationChannels)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(syndicationChannels.id, id))
            .returning();
        return updatedChannel;
    }
    async deleteSyndicationChannel(id) {
        await db.delete(syndicationChannels).where(eq(syndicationChannels.id, id));
    }
    // Product syndication operations
    async createProductSyndication(syndication) {
        const [newSyndication] = await db.insert(productSyndications).values(syndication).returning();
        return newSyndication;
    }
    async getProductSyndications(productId, channelId) {
        let query = db
            .select({
            id: productSyndications.id,
            productId: productSyndications.productId,
            channelId: productSyndications.channelId,
            status: productSyndications.status,
            externalId: productSyndications.externalId,
            externalUrl: productSyndications.externalUrl,
            lastSyncAt: productSyndications.lastSyncAt,
            lastSyncStatus: productSyndications.lastSyncStatus,
            errorMessage: productSyndications.errorMessage,
            syncRetries: productSyndications.syncRetries,
            isEnabled: productSyndications.isEnabled,
            createdAt: productSyndications.createdAt,
            updatedAt: productSyndications.updatedAt,
            channelName: syndicationChannels.name,
            channelType: syndicationChannels.type,
            productName: products.name,
        })
            .from(productSyndications)
            .leftJoin(syndicationChannels, eq(productSyndications.channelId, syndicationChannels.id))
            .leftJoin(products, eq(productSyndications.productId, products.id));
        const conditions = [];
        if (productId) {
            conditions.push(eq(productSyndications.productId, productId));
        }
        if (channelId) {
            conditions.push(eq(productSyndications.channelId, channelId));
        }
        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }
        return await query.orderBy(desc(productSyndications.updatedAt));
    }
    async getProductSyndication(productId, channelId) {
        const [syndication] = await db
            .select()
            .from(productSyndications)
            .where(and(eq(productSyndications.productId, productId), eq(productSyndications.channelId, channelId)));
        return syndication;
    }
    async updateProductSyndication(id, updates) {
        const [updatedSyndication] = await db
            .update(productSyndications)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(productSyndications.id, id))
            .returning();
        return updatedSyndication;
    }
    async deleteProductSyndication(id) {
        await db.delete(productSyndications).where(eq(productSyndications.id, id));
    }
    // Syndication logs operations
    async createSyndicationLog(log) {
        const [newLog] = await db.insert(syndicationLogs).values(log).returning();
        return newLog;
    }
    async getSyndicationLogs(productId, channelId, limit = 100) {
        let query = db
            .select({
            id: syndicationLogs.id,
            channelId: syndicationLogs.channelId,
            productId: syndicationLogs.productId,
            action: syndicationLogs.action,
            endpoint: syndicationLogs.endpoint,
            method: syndicationLogs.method,
            status: syndicationLogs.status,
            responseTime: syndicationLogs.responseTime,
            requestPayload: syndicationLogs.requestPayload,
            responsePayload: syndicationLogs.responsePayload,
            errorMessage: syndicationLogs.errorMessage,
            triggeredBy: syndicationLogs.triggeredBy,
            createdAt: syndicationLogs.createdAt,
            channelName: syndicationChannels.name,
            productName: products.name,
        })
            .from(syndicationLogs)
            .leftJoin(syndicationChannels, eq(syndicationLogs.channelId, syndicationChannels.id))
            .leftJoin(products, eq(syndicationLogs.productId, products.id));
        const conditions = [];
        if (productId) {
            conditions.push(eq(syndicationLogs.productId, productId));
        }
        if (channelId) {
            conditions.push(eq(syndicationLogs.channelId, channelId));
        }
        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }
        return await query
            .orderBy(desc(syndicationLogs.createdAt))
            .limit(limit);
    }
    // Dashboard analytics
    async getDashboardStats(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const brandCountResult = await db
            .select({ count: count() })
            .from(brands)
            .where(eq(brands.ownerId, userId));
        const brandCount = brandCountResult?.[0];
        const productCountResult = await db
            .select({ count: count() })
            .from(products)
            .leftJoin(brands, eq(products.brandId, brands.id))
            .where(eq(brands.ownerId, userId));
        const productCount = productCountResult?.[0];
        const syncCountResult = await db
            .select({ count: count() })
            .from(syndicationLogs)
            .where(sql `${syndicationLogs.createdAt} >= ${today}`);
        const syncCount = syncCountResult?.[0];
        return {
            totalBrands: brandCount?.count || 0,
            totalProducts: productCount?.count || 0,
            apiSyncsToday: syncCount?.count || 0,
            avgTimeToMarket: 8.2, // Mock value for now
        };
    }
    // Search operations
    async searchProducts(query) {
        return await db
            .select()
            .from(products)
            .where(or(like(products.name, `%${query}%`), like(products.shortDescription, `%${query}%`), like(products.sku, `%${query}%`)))
            .orderBy(desc(products.createdAt))
            .limit(20);
    }
    async searchBrands(query) {
        return await db
            .select()
            .from(brands)
            .where(or(like(brands.name, `%${query}%`), like(brands.description, `%${query}%`)))
            .orderBy(desc(brands.createdAt))
            .limit(20);
    }
}
export const storage = new DatabaseStorage();
//# sourceMappingURL=storage.js.map