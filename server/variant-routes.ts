// Phase 3.5: Product Variants API Routes
import type { Express } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import {
  variantOptions,
  variantOptionValues,
  productVariantOptions,
  productVariants,
  variantCombinations,
  products,
} from "@shared/schema";
import {
  variantOptionSchema,
  variantOptionValueSchema,
  variantGenerationSchema,
  type VariantOptionWithValues,
  type ProductVariantWithCombinations,
  type VariantGenerationConfig,
  type BulkVariantOperation,
} from "@shared/variant-types";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { db } from "./db";

export function registerVariantRoutes(app: Express) {
  // Get all global variant options with their values
  app.get("/api/variants/options", isAuthenticated, async (req, res) => {
    try {
      const options = await db.query.variantOptions.findMany({
        where: eq(variantOptions.isGlobal, true),
        with: {
          values: {
            where: eq(variantOptionValues.isActive, true),
            orderBy: asc(variantOptionValues.sortOrder),
          },
        },
        orderBy: asc(variantOptions.sortOrder),
      });

      res.json(options);
    } catch (error) {
      console.error("Error fetching variant options:", error);
      res.status(500).json({ message: "Failed to fetch variant options" });
    }
  });

  // Get variant options for a specific product
  app.get("/api/products/:id/variants/options", isAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      
      const productOptions = await db.query.productVariantOptions.findMany({
        where: eq(productVariantOptions.productId, productId),
        with: {
          option: {
            with: {
              values: {
                where: eq(variantOptionValues.isActive, true),
                orderBy: asc(variantOptionValues.sortOrder),
              },
            },
          },
        },
      });

      res.json(productOptions);
    } catch (error) {
      console.error("Error fetching product variant options:", error);
      res.status(500).json({ message: "Failed to fetch product variant options" });
    }
  });

  // Set variant options for a product
  app.post("/api/products/:id/variants/options", isAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const { optionIds } = req.body; // Array of option IDs

      if (!Array.isArray(optionIds)) {
        return res.status(400).json({ message: "optionIds must be an array" });
      }

      await db.transaction(async (tx) => {
        // Remove existing options
        await tx.delete(productVariantOptions)
          .where(eq(productVariantOptions.productId, productId));

        // Add new options
        if (optionIds.length > 0) {
          await tx.insert(productVariantOptions).values(
            optionIds.map((optionId: number) => ({
              productId,
              optionId,
            }))
          );
        }
      });

      res.json({ message: "Product variant options updated successfully" });
    } catch (error) {
      console.error("Error updating product variant options:", error);
      res.status(500).json({ message: "Failed to update product variant options" });
    }
  });

  // Get all variants for a product
  app.get("/api/products/:id/variants", isAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      
      const variants = await db.query.productVariants.findMany({
        where: eq(productVariants.parentProductId, productId),
        with: {
          variantProduct: true,
          combinations: {
            with: {
              option: true,
              optionValue: true,
            },
          },
        },
        orderBy: asc(productVariants.sortOrder),
      });

      res.json(variants);
    } catch (error) {
      console.error("Error fetching product variants:", error);
      res.status(500).json({ message: "Failed to fetch product variants" });
    }
  });

  // Generate variants for a product
  app.post("/api/products/:id/variants/generate", isAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const config: VariantGenerationConfig = req.body.config;

      // Validate the configuration
      const validatedData = variantGenerationSchema.parse({
        parentProductId: productId,
        config,
      });

      // Get the parent product
      const parentProduct = await db.query.products.findFirst({
        where: eq(products.id, productId),
      });

      if (!parentProduct) {
        return res.status(404).json({ message: "Parent product not found" });
      }

      // Get the selected options and their values
      const optionsWithValues = await Promise.all(
        config.selectedOptions.map(async (selectedOption) => {
          const option = await db.query.variantOptions.findFirst({
            where: eq(variantOptions.id, selectedOption.optionId),
            with: {
              values: {
                where: sql`${variantOptionValues.id} = ANY(${selectedOption.values})`,
              },
            },
          });
          return { option, selectedValues: option?.values || [] };
        })
      );

      // Generate all combinations
      const combinations = generateVariantCombinations(optionsWithValues);

      // Create variants in a transaction
      const createdVariants = await db.transaction(async (tx) => {
        const variants = [];

        for (let i = 0; i < combinations.length; i++) {
          const combination = combinations[i];
          
          // Generate variant name
          const variantName = generateVariantName(parentProduct.name, combination, config.naming);
          
          // Generate SKU
          const variantSku = generateVariantSku(parentProduct.sku, combination, config.skuGeneration);
          
          // Calculate price adjustment
          const priceAdjustment = calculatePriceAdjustment(combination, config.pricing);
          
          // Determine stock level
          const stockLevel = determineStockLevel(combination, config.inventory);

          // Create variant product
          const [variantProduct] = await tx.insert(products).values({
            name: variantName,
            slug: `${parentProduct.slug}-${generateSlugSuffix(combination)}`,
            shortDescription: parentProduct.shortDescription,
            longDescription: parentProduct.longDescription,
            brandId: parentProduct.brandId,
            parentId: parentProduct.id,
            sku: variantSku,
            status: parentProduct.status,
            isVariant: true,
            price: config.pricing.strategy === 'inherit' 
              ? parentProduct.price 
              : parentProduct.price ? parentProduct.price + priceAdjustment : null,
            compareAtPrice: parentProduct.compareAtPrice,
            stock: stockLevel,
            lowStockThreshold: parentProduct.lowStockThreshold,
          }).returning();

          // Create product variant entry
          const [productVariant] = await tx.insert(productVariants).values({
            parentProductId: productId,
            variantProductId: variantProduct.id,
            variantSku,
            variantName,
            priceAdjustment,
            weightAdjustment: 0,
            isActive: true,
            sortOrder: i,
          }).returning();

          // Create variant combinations
          for (const { optionId, valueId } of combination) {
            await tx.insert(variantCombinations).values({
              variantId: productVariant.id,
              optionId,
              optionValueId: valueId,
            });
          }

          variants.push({
            ...productVariant,
            variantProduct,
            combinations: combination,
          });
        }

        return variants;
      });

      res.json({
        message: `Generated ${createdVariants.length} variants successfully`,
        variants: createdVariants,
      });
    } catch (error) {
      console.error("Error generating variants:", error);
      res.status(500).json({ 
        message: "Failed to generate variants",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update a single variant
  app.patch("/api/variants/:id", isAuthenticated, async (req, res) => {
    try {
      const variantId = parseInt(req.params.id);
      const updates = req.body;

      const variant = await db.query.productVariants.findFirst({
        where: eq(productVariants.id, variantId),
        with: {
          variantProduct: true,
        },
      });

      if (!variant) {
        return res.status(404).json({ message: "Variant not found" });
      }

      await db.transaction(async (tx) => {
        // Update variant record
        if (updates.variantName || updates.priceAdjustment !== undefined || 
            updates.isActive !== undefined || updates.sortOrder !== undefined) {
          await tx.update(productVariants)
            .set({
              variantName: updates.variantName,
              priceAdjustment: updates.priceAdjustment,
              isActive: updates.isActive,
              sortOrder: updates.sortOrder,
              updatedAt: new Date(),
            })
            .where(eq(productVariants.id, variantId));
        }

        // Update variant product
        if (updates.name || updates.price !== undefined || updates.stock !== undefined ||
            updates.status || updates.sku) {
          await tx.update(products)
            .set({
              name: updates.name,
              price: updates.price,
              stock: updates.stock,
              status: updates.status,
              sku: updates.sku,
              updatedAt: new Date(),
            })
            .where(eq(products.id, variant.variantProductId));
        }
      });

      res.json({ message: "Variant updated successfully" });
    } catch (error) {
      console.error("Error updating variant:", error);
      res.status(500).json({ message: "Failed to update variant" });
    }
  });

  // Delete a variant
  app.delete("/api/variants/:id", isAuthenticated, async (req, res) => {
    try {
      const variantId = parseInt(req.params.id);

      const variant = await db.query.productVariants.findFirst({
        where: eq(productVariants.id, variantId),
      });

      if (!variant) {
        return res.status(404).json({ message: "Variant not found" });
      }

      await db.transaction(async (tx) => {
        // Delete variant combinations
        await tx.delete(variantCombinations)
          .where(eq(variantCombinations.variantId, variantId));

        // Delete product variant
        await tx.delete(productVariants)
          .where(eq(productVariants.id, variantId));

        // Delete variant product
        await tx.delete(products)
          .where(eq(products.id, variant.variantProductId));
      });

      res.json({ message: "Variant deleted successfully" });
    } catch (error) {
      console.error("Error deleting variant:", error);
      res.status(500).json({ message: "Failed to delete variant" });
    }
  });

  // Bulk operations on variants
  app.post("/api/variants/bulk", isAuthenticated, async (req, res) => {
    try {
      const operation: BulkVariantOperation = req.body;

      if (!operation.variants || !Array.isArray(operation.variants)) {
        return res.status(400).json({ message: "variants array is required" });
      }

      await db.transaction(async (tx) => {
        switch (operation.action) {
          case 'activate':
            await tx.update(productVariants)
              .set({ isActive: true, updatedAt: new Date() })
              .where(sql`${productVariants.id} = ANY(${operation.variants})`);
            break;

          case 'deactivate':
            await tx.update(productVariants)
              .set({ isActive: false, updatedAt: new Date() })
              .where(sql`${productVariants.id} = ANY(${operation.variants})`);
            break;

          case 'update':
            if (operation.data) {
              await tx.update(productVariants)
                .set({ ...operation.data, updatedAt: new Date() })
                .where(sql`${productVariants.id} = ANY(${operation.variants})`);
            }
            break;

          case 'delete':
            // Delete combinations first
            await tx.delete(variantCombinations)
              .where(sql`${variantCombinations.variantId} = ANY(${operation.variants})`);
            
            // Get variant product IDs
            const variantsToDelete = await tx.select({ variantProductId: productVariants.variantProductId })
              .from(productVariants)
              .where(sql`${productVariants.id} = ANY(${operation.variants})`);
            
            const variantProductIds = variantsToDelete.map(v => v.variantProductId);
            
            // Delete product variants
            await tx.delete(productVariants)
              .where(sql`${productVariants.id} = ANY(${operation.variants})`);
            
            // Delete variant products
            if (variantProductIds.length > 0) {
              await tx.delete(products)
                .where(sql`${products.id} = ANY(${variantProductIds})`);
            }
            break;

          default:
            throw new Error(`Unknown bulk operation: ${operation.action}`);
        }
      });

      res.json({ 
        message: `Bulk ${operation.action} completed for ${operation.variants.length} variants` 
      });
    } catch (error) {
      console.error("Error performing bulk operation:", error);
      res.status(500).json({ message: "Failed to perform bulk operation" });
    }
  });

  // Create a new variant option (for admins)
  app.post("/api/variants/options", isAuthenticated, async (req, res) => {
    try {
      const validatedData = variantOptionSchema.parse(req.body);

      const [option] = await db.insert(variantOptions).values(validatedData).returning();

      res.json(option);
    } catch (error) {
      console.error("Error creating variant option:", error);
      res.status(500).json({ message: "Failed to create variant option" });
    }
  });

  // Add values to a variant option
  app.post("/api/variants/options/:id/values", isAuthenticated, async (req, res) => {
    try {
      const optionId = parseInt(req.params.id);
      const { values } = req.body;

      if (!Array.isArray(values)) {
        return res.status(400).json({ message: "values must be an array" });
      }

      const validatedValues = values.map(value => 
        variantOptionValueSchema.parse({ ...value, optionId })
      );

      const createdValues = await db.insert(variantOptionValues)
        .values(validatedValues)
        .returning();

      res.json(createdValues);
    } catch (error) {
      console.error("Error creating variant option values:", error);
      res.status(500).json({ message: "Failed to create variant option values" });
    }
  });
}

// Helper functions for variant generation
function generateVariantCombinations(optionsWithValues: any[]) {
  if (optionsWithValues.length === 0) return [];
  
  const combinations: Array<{ optionId: number; valueId: number }[]> = [];
  
  function generateRecursive(
    currentCombination: { optionId: number; valueId: number }[],
    remainingOptions: any[],
  ) {
    if (remainingOptions.length === 0) {
      combinations.push([...currentCombination]);
      return;
    }
    
    const [firstOption, ...restOptions] = remainingOptions;
    
    for (const value of firstOption.selectedValues) {
      currentCombination.push({
        optionId: firstOption.option.id,
        valueId: value.id,
      });
      generateRecursive(currentCombination, restOptions);
      currentCombination.pop();
    }
  }
  
  generateRecursive([], optionsWithValues);
  return combinations;
}

function generateVariantName(
  parentName: string,
  combination: { optionId: number; valueId: number }[],
  namingConfig: { pattern: string; includeParentName: boolean },
) {
  // This would be expanded to use the actual option/value names
  // For now, return a simple pattern
  return namingConfig.includeParentName ? `${parentName} - Variant` : "Variant";
}

function generateVariantSku(
  parentSku: string | null,
  combination: { optionId: number; valueId: number }[],
  skuConfig: { strategy: string; pattern?: string; separator?: string },
) {
  if (!parentSku) return null;
  
  const suffix = combination.map(c => c.valueId).join(skuConfig.separator || '-');
  return `${parentSku}-${suffix}`;
}

function generateSlugSuffix(combination: { optionId: number; valueId: number }[]) {
  return combination.map(c => `${c.optionId}-${c.valueId}`).join('-');
}

function calculatePriceAdjustment(
  combination: { optionId: number; valueId: number }[],
  pricingConfig: { strategy: string; adjustments?: { [key: string]: number } },
) {
  if (pricingConfig.strategy === 'inherit') return 0;
  
  // This would be expanded to calculate based on the actual configuration
  return 0;
}

function determineStockLevel(
  combination: { optionId: number; valueId: number }[],
  inventoryConfig: { strategy: string; defaultStock?: number; stockPerVariant?: { [key: string]: number } },
) {
  if (inventoryConfig.strategy === 'unlimited') return null;
  
  return inventoryConfig.defaultStock || 0;
}