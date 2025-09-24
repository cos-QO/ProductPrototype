// Phase 3.5: Variant Types Addition
// These types should be added to shared/schema.ts

import { z } from "zod";

// Additional variant types and interfaces for the UI
export interface VariantOptionWithValues {
  id: number;
  name: string;
  slug: string;
  displayName: string;
  description: string | null;
  optionType: string;
  isGlobal: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  values: {
    id: number;
    optionId: number;
    value: string;
    displayValue: string;
    hexColor: string | null;
    imageUrl: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
  }[];
}

export interface ProductVariantWithCombinations {
  id: number;
  parentProductId: number;
  variantProductId: number;
  variantSku: string | null;
  variantName: string | null;
  priceAdjustment: number;
  weightAdjustment: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  combinations: {
    id: number;
    variantId: number;
    optionId: number;
    optionValueId: number;
    createdAt: Date;
    option: {
      id: number;
      name: string;
      displayName: string;
      optionType: string;
    };
    optionValue: {
      id: number;
      value: string;
      displayValue: string;
      hexColor: string | null;
      imageUrl: string | null;
    };
  }[];
  variantProduct: {
    id: number;
    name: string;
    slug: string;
    sku: string | null;
    price: number | null;
    compareAtPrice: number | null;
    stock: number | null;
    status: string;
  };
}

export interface VariantFormData {
  options: {
    optionId: number;
    selectedValues: number[];
  }[];
  pricing: {
    useParentPricing: boolean;
    priceAdjustments: { [key: string]: number };
  };
  inventory: {
    trackInventory: boolean;
    stockLevels: { [key: string]: number };
  };
  skuGeneration: {
    pattern: string;
    autoGenerate: boolean;
  };
}

export interface VariantGenerationConfig {
  generateAllCombinations: boolean;
  selectedOptions: {
    optionId: number;
    values: number[];
  }[];
  pricing: {
    strategy: "inherit" | "adjust" | "individual";
    basePrice?: number;
    adjustments?: { [combination: string]: number };
  };
  inventory: {
    strategy: "track" | "unlimited";
    defaultStock?: number;
    stockPerVariant?: { [combination: string]: number };
  };
  naming: {
    pattern: string; // e.g., "{parent_name} - {size} {color}"
    includeParentName: boolean;
  };
  skuGeneration: {
    strategy: "auto" | "manual" | "pattern";
    pattern?: string; // e.g., "{parent_sku}-{size_code}-{color_code}"
    separator?: string;
  };
}

export interface VariantCombinationKey {
  [optionId: number]: number; // optionId -> optionValueId
}

export interface VariantValidationError {
  field: string;
  message: string;
  variantIndex?: number;
  combination?: VariantCombinationKey;
}

export interface BulkVariantOperation {
  action: "create" | "update" | "delete" | "activate" | "deactivate";
  variants: number[]; // variant IDs
  data?: Partial<{
    priceAdjustment: number;
    stock: number;
    isActive: boolean;
  }>;
}

export interface VariantImportData {
  parentProductId: number;
  variants: {
    combinations: { [optionSlug: string]: string }; // e.g., { "size": "large", "color": "red" }
    sku?: string;
    name?: string;
    priceAdjustment?: number;
    stock?: number;
    isActive?: boolean;
  }[];
}

// Validation schemas
export const variantOptionSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1).max(100),
  description: z.string().optional(),
  optionType: z.enum(["text", "color", "size", "image", "number"]),
  isGlobal: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

export const variantOptionValueSchema = z.object({
  optionId: z.number(),
  value: z.string().min(1).max(255),
  displayValue: z.string().min(1).max(255),
  hexColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  imageUrl: z.string().url().max(500).optional(),
  sortOrder: z.number().default(0),
});

export const variantGenerationSchema = z.object({
  parentProductId: z.number(),
  config: z.object({
    generateAllCombinations: z.boolean(),
    selectedOptions: z.array(
      z.object({
        optionId: z.number(),
        values: z.array(z.number()),
      }),
    ),
    pricing: z.object({
      strategy: z.enum(["inherit", "adjust", "individual"]),
      basePrice: z.number().optional(),
      adjustments: z.record(z.number()).optional(),
    }),
    inventory: z.object({
      strategy: z.enum(["track", "unlimited"]),
      defaultStock: z.number().optional(),
      stockPerVariant: z.record(z.number()).optional(),
    }),
    naming: z.object({
      pattern: z.string(),
      includeParentName: z.boolean(),
    }),
    skuGeneration: z.object({
      strategy: z.enum(["auto", "manual", "pattern"]),
      pattern: z.string().optional(),
      separator: z.string().default("-"),
    }),
  }),
});
