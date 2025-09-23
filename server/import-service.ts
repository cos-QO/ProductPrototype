import { Request, Response } from "express";
import { db } from "./db";
import { brands, products, productAttributes } from "@shared/schema";
import multer from "multer";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";

// Configure multer for file uploads
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "text/csv",
      "application/json",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only CSV, JSON, and Excel files are allowed.",
        ),
      );
    }
  },
});

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  data?: any[];
}

// JSON Import Handler
export async function importJSON(req: Request, res: Response) {
  try {
    const { type } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const jsonData = JSON.parse(file.buffer.toString());
    const result = await processImport(type, jsonData);

    res.json(result);
  } catch (error: any) {
    console.error("JSON import error:", error);
    res.status(500).json({
      error: "Import failed",
      message: error.message,
    });
  }
}

// CSV Import Handler
export async function importCSV(req: Request, res: Response) {
  try {
    const { type } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Parse CSV with safer parsing options
    const records = parse(file.buffer.toString(), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: false, // Disable auto-casting to prevent data corruption
      cast_date: false, // Disable date auto-casting
      relax_quotes: true, // Handle malformed quotes gracefully
      relax_column_count: true, // Handle varying column counts
    });

    const result = await processImport(type, records);
    res.json(result);
  } catch (error: any) {
    console.error("CSV import error:", error);
    res.status(500).json({
      error: "Import failed",
      message: error.message,
    });
  }
}

// Excel Import Handler
export async function importExcel(req: Request, res: Response) {
  try {
    const { type } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Parse Excel
    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    const result = await processImport(type, jsonData);
    res.json(result);
  } catch (error: any) {
    console.error("Excel import error:", error);
    res.status(500).json({
      error: "Import failed",
      message: error.message,
    });
  }
}

// Process imported data based on type
async function processImport(type: string, data: any[]): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: 0,
    failed: 0,
    errors: [],
    data: [],
  };

  if (!Array.isArray(data) || data.length === 0) {
    result.errors.push("No valid data found in file");
    return result;
  }

  switch (type) {
    case "brands":
      return await importBrands(data);
    case "products":
      return await importProducts(data);
    case "attributes":
      return await importProductAttributes(data);
    default:
      result.errors.push(`Unknown import type: ${type}`);
      return result;
  }
}

// Import Brands
async function importBrands(data: any[]): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: 0,
    failed: 0,
    errors: [],
    data: [],
  };

  for (const row of data) {
    try {
      // Validate required fields
      if (!row.name || !row.slug) {
        result.errors.push(
          `Row ${result.imported + result.failed + 1}: Missing required fields (name, slug)`,
        );
        result.failed++;
        continue;
      }

      // Transform data
      const brandData = {
        name: row.name,
        slug: row.slug.toLowerCase().replace(/\s+/g, "-"),
        description: row.description || null,
        story: row.story || null,
        category: row.category || null,
        logoUrl: row.logo_url || row.logoUrl || null,
        ownerId: row.owner_id || row.ownerId || null,
        isActive: row.is_active !== undefined ? row.is_active : true,
      };

      // Insert into database
      const [inserted] = await db.insert(brands).values(brandData).returning();

      result.data?.push(inserted);
      result.imported++;
    } catch (error: any) {
      result.errors.push(
        `Row ${result.imported + result.failed + 1}: ${error.message}`,
      );
      result.failed++;
    }
  }

  result.success = result.imported > 0;
  return result;
}

// Import Products
async function importProducts(data: any[]): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: 0,
    failed: 0,
    errors: [],
    data: [],
  };

  for (const row of data) {
    try {
      // Validate required fields
      if (!row.name || !row.slug) {
        result.errors.push(
          `Row ${result.imported + result.failed + 1}: Missing required fields (name, slug)`,
        );
        result.failed++;
        continue;
      }

      // Handle numeric fields (prices should be in cents)
      let price = null;
      if (row.price) {
        const priceValue = parseFloat(row.price);
        // If price looks like dollars (has decimal), convert to cents
        price =
          priceValue < 1000 && priceValue % 1 !== 0
            ? Math.round(priceValue * 100)
            : Math.round(priceValue);
      }

      let compareAtPrice = null;
      const compareField = row.compare_at_price || row.compareAtPrice;
      if (compareField) {
        const compareValue = parseFloat(compareField);
        // If price looks like dollars (has decimal), convert to cents
        compareAtPrice =
          compareValue < 1000 && compareValue % 1 !== 0
            ? Math.round(compareValue * 100)
            : Math.round(compareValue);
      }

      const stock = row.stock ? parseInt(row.stock) : null;
      const weight = row.weight ? parseInt(row.weight) : null;
      const parentId =
        row.parent_id || row.parentId
          ? parseInt(row.parent_id || row.parentId)
          : null;

      // Transform core product data
      const productData = {
        name: row.name,
        slug: row.slug.toLowerCase().replace(/\s+/g, "-"),
        shortDescription: row.short_description || row.shortDescription || null,
        longDescription: row.long_description || row.longDescription || null,
        story: row.story || null,
        brandId:
          row.brand_id || row.brandId
            ? parseInt(row.brand_id || row.brandId)
            : null,
        parentId,
        sku: row.sku || null,
        gtin: row.gtin || null,
        status: row.status || "draft",
        isVariant: row.is_variant || row.isVariant || false,
        price,
        compareAtPrice,
        stock,
        lowStockThreshold:
          row.low_stock_threshold || row.lowStockThreshold
            ? parseInt(row.low_stock_threshold || row.lowStockThreshold)
            : null,
      };

      // Insert into database
      const [inserted] = await db
        .insert(products)
        .values(productData)
        .returning();

      // Handle product attributes if they exist
      const attributesToInsert = [];

      // Weight attribute
      if (weight !== null) {
        attributesToInsert.push({
          productId: inserted.id,
          attributeName: "weight",
          attributeValue: weight.toString(),
          attributeType: "number",
        });
      }

      // Dimensions attribute
      if (row.dimensions) {
        attributesToInsert.push({
          productId: inserted.id,
          attributeName: "dimensions",
          attributeValue: row.dimensions,
          attributeType: "text",
        });
      }

      // Tags attribute
      if (row.tags) {
        attributesToInsert.push({
          productId: inserted.id,
          attributeName: "tags",
          attributeValue: row.tags,
          attributeType: "text",
        });
      }

      // Variants attribute
      if (row.variants) {
        attributesToInsert.push({
          productId: inserted.id,
          attributeName: "variants",
          attributeValue: row.variants,
          attributeType: "text",
        });
      }

      // Category attribute
      if (row.category) {
        attributesToInsert.push({
          productId: inserted.id,
          attributeName: "category",
          attributeValue: row.category,
          attributeType: "text",
        });
      }

      // Condition attribute
      if (row.condition) {
        attributesToInsert.push({
          productId: inserted.id,
          attributeName: "condition",
          attributeValue: row.condition,
          attributeType: "text",
        });
      }

      // Warranty attribute
      if (row.warranty) {
        attributesToInsert.push({
          productId: inserted.id,
          attributeName: "warranty",
          attributeValue: row.warranty,
          attributeType: "text",
        });
      }

      // Insert all attributes
      if (attributesToInsert.length > 0) {
        await db.insert(productAttributes).values(attributesToInsert);
      }

      result.data?.push(inserted);
      result.imported++;
    } catch (error: any) {
      result.errors.push(
        `Row ${result.imported + result.failed + 1}: ${error.message}`,
      );
      result.failed++;
    }
  }

  result.success = result.imported > 0;
  return result;
}

// Import Product Attributes
async function importProductAttributes(data: any[]): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: 0,
    failed: 0,
    errors: [],
    data: [],
  };

  for (const row of data) {
    try {
      // Validate required fields
      if (!row.product_id || !row.attribute_name) {
        result.errors.push(
          `Row ${result.imported + result.failed + 1}: Missing required fields`,
        );
        result.failed++;
        continue;
      }

      const attributeData = {
        productId: parseInt(row.product_id || row.productId),
        attributeName: row.attribute_name || row.attributeName,
        attributeValue: row.attribute_value || row.attributeValue || null,
        attributeType: row.attribute_type || row.attributeType || "text",
      };

      const [inserted] = await db
        .insert(productAttributes)
        .values(attributeData)
        .returning();

      result.data?.push(inserted);
      result.imported++;
    } catch (error: any) {
      result.errors.push(
        `Row ${result.imported + result.failed + 1}: ${error.message}`,
      );
      result.failed++;
    }
  }

  result.success = result.imported > 0;
  return result;
}

// Bulk import from multiple sources
export async function bulkImport(req: Request, res: Response) {
  try {
    const { data } = req.body;

    if (!data || typeof data !== "object") {
      return res.status(400).json({ error: "Invalid data format" });
    }

    const results: Record<string, ImportResult> = {};

    // Import brands first
    if (data.brands) {
      results.brands = await importBrands(data.brands);
    }

    // Then import products (depends on brands)
    if (data.products) {
      results.products = await importProducts(data.products);
    }

    // Finally import attributes (depends on products)
    if (data.attributes) {
      results.attributes = await importProductAttributes(data.attributes);
    }

    const totalImported = Object.values(results).reduce(
      (sum, r) => sum + r.imported,
      0,
    );
    const totalFailed = Object.values(results).reduce(
      (sum, r) => sum + r.failed,
      0,
    );

    res.json({
      success: totalImported > 0,
      results,
      summary: {
        totalImported,
        totalFailed,
      },
    });
  } catch (error: any) {
    console.error("Bulk import error:", error);
    res.status(500).json({
      error: "Bulk import failed",
      message: error.message,
    });
  }
}

// Download template files
export function downloadTemplate(req: Request, res: Response) {
  const { type, format } = req.params;

  const templates: Record<string, any> = {
    brands: [
      {
        name: "Example Brand",
        slug: "example-brand",
        description: "Brand description",
        story: "Brand story",
        category: "Electronics",
        logo_url: "https://example.com/logo.png",
        is_active: true,
      },
    ],
    products: [
      {
        // Core Product Fields
        name: "Premium Wireless Headphones",
        slug: "premium-wireless-headphones",
        short_description:
          "Noise-canceling headphones with 30-hour battery life",
        long_description:
          "Professional-grade wireless headphones featuring active noise cancellation, premium drivers, and extended battery life. Perfect for music production, gaming, and daily listening.",
        story:
          "Engineered by audio professionals who understand that great sound shouldn't compromise on comfort or convenience.",
        brand_id: 1,
        parent_id: null,
        sku: "AT-WH-001",
        gtin: "1234567890123",
        status: "active",
        is_variant: false,
        price: 29999, // Price in cents ($299.99)
        compare_at_price: 39999, // Compare price in cents ($399.99)
        stock: 150,
        low_stock_threshold: 25,

        // Common Product Attributes
        weight: 350, // Weight in grams
        dimensions: "20x15x8", // LxWxH in cm
        tags: "wireless,headphones,premium,noise-canceling,audio",
        variants: "Color: Black|White|Silver, Size: Standard",
        category: "Electronics",
        condition: "new",
        warranty: "2 years manufacturer warranty",
      },
      {
        // Core Product Fields
        name: "Organic Cotton T-Shirt",
        slug: "organic-cotton-t-shirt",
        short_description:
          "Sustainable organic cotton t-shirt in multiple colors",
        long_description:
          "Made from 100% certified organic cotton, this comfortable t-shirt features a classic fit and is available in a range of colors. Ethically sourced and environmentally friendly.",
        story:
          "Part of our commitment to sustainable fashion, supporting organic farming communities worldwide.",
        brand_id: 2,
        parent_id: null,
        sku: "OC-TS-001",
        gtin: "2345678901234",
        status: "active",
        is_variant: false,
        price: 2999, // Price in cents ($29.99)
        compare_at_price: 3499, // Compare price in cents ($34.99)
        stock: 200,
        low_stock_threshold: 50,

        // Common Product Attributes
        weight: 180, // Weight in grams
        dimensions: "60x45x2", // LxWxH in cm (folded)
        tags: "organic,cotton,sustainable,fashion,t-shirt",
        variants: "Color: White|Black|Navy|Gray, Size: XS|S|M|L|XL|XXL",
        category: "Clothing",
        condition: "new",
        warranty: "30 days return policy",
      },
      {
        // Core Product Fields
        name: "Bamboo Coffee Table",
        slug: "bamboo-coffee-table",
        short_description: "Sustainable bamboo coffee table with modern design",
        long_description:
          "Handcrafted coffee table made from sustainably sourced bamboo. Features a minimalist design with clean lines and a natural finish that complements any living space.",
        story:
          "Each piece is carefully crafted by skilled artisans who take pride in creating furniture that's both beautiful and environmentally responsible.",
        brand_id: 3,
        parent_id: null,
        sku: "BF-CT-001",
        gtin: "3456789012345",
        status: "active",
        is_variant: false,
        price: 24999, // Price in cents ($249.99)
        compare_at_price: 29999, // Compare price in cents ($299.99)
        stock: 25,
        low_stock_threshold: 5,

        // Common Product Attributes
        weight: 12000, // Weight in grams (12kg)
        dimensions: "120x60x45", // LxWxH in cm
        tags: "bamboo,furniture,sustainable,coffee-table,home",
        variants: "Finish: Natural|Dark|Light, Size: Standard",
        category: "Home & Garden",
        condition: "new",
        warranty: "5 years structural warranty",
      },
    ],
    attributes: [
      {
        product_id: 1,
        attribute_name: "Color",
        attribute_value: "Blue",
        attribute_type: "text",
      },
      {
        product_id: 1,
        attribute_name: "Weight",
        attribute_value: "500",
        attribute_type: "number",
      },
    ],
  };

  const template = templates[type];

  if (!template) {
    return res.status(404).json({ error: "Template not found" });
  }

  switch (format) {
    case "json":
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${type}-template.json"`,
      );
      res.json(template);
      break;

    case "csv":
      const csvContent = convertToCSV(template);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${type}-template.csv"`,
      );
      res.send(csvContent);
      break;

    case "xlsx":
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(template);
      XLSX.utils.book_append_sheet(workbook, worksheet, type);
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${type}-template.xlsx"`,
      );
      res.send(buffer);
      break;

    default:
      res.status(400).json({ error: "Invalid format" });
  }
}

// SECURITY: Sanitize CSV values to prevent injection attacks
function sanitizeCSVValue(value: any): string {
  if (value === null || value === undefined) return "";

  let stringValue = String(value);

  // SECURITY: Prevent CSV injection by escaping dangerous starting characters
  const dangerousChars = ["=", "+", "-", "@", "\t", "\r"];
  if (dangerousChars.some((char) => stringValue.startsWith(char))) {
    // Prefix with single quote to prevent formula interpretation
    stringValue = "'" + stringValue;
  }

  // Handle commas and quotes for CSV formatting
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

// Helper function to convert JSON to CSV with security sanitization
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csv = [
    headers.map((header) => sanitizeCSVValue(header)).join(","),
    ...data.map((row) =>
      headers.map((header) => sanitizeCSVValue(row[header])).join(","),
    ),
  ];

  return csv.join("\n");
}
