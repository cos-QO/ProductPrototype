import * as schema from "@shared/schema";
import { count, eq, and, desc, sql } from "drizzle-orm";

// In-memory storage for all tables
export const mockData = {
  users: [] as any[],
  brands: [] as any[],
  products: [] as any[],
  mediaAssets: [] as any[],
  productAttributes: [] as any[],
  productVariations: [] as any[],
  productVariationOptions: [] as any[],
  apiSyncs: [] as any[],
  productApiConfigs: [] as any[],
  syndicationLogs: [] as any[],
  channelProducts: [] as any[],
};

// ID counters for auto-increment simulation
const idCounters: Record<string, number> = {
  brands: 1,
  products: 1,
  mediaAssets: 1,
  productAttributes: 1,
  productVariations: 1,
  productVariationOptions: 1,
  apiSyncs: 1,
  productApiConfigs: 1,
  syndicationLogs: 1,
  channelProducts: 1,
};

// Helper to get next ID
function getNextId(table: string): number {
  const id = idCounters[table] || 1;
  idCounters[table] = id + 1;
  return id;
}

// Helper to determine table name from schema object
function getTableName(table: any): string | null {
  if (table === schema.users || table?.name === 'users') return 'users';
  if (table === schema.brands || table?.name === 'brands') return 'brands';
  if (table === schema.products || table?.name === 'products') return 'products';
  if (table === schema.mediaAssets || table?.name === 'media_assets') return 'mediaAssets';
  if (table === schema.productAttributes || table?.name === 'product_attributes') return 'productAttributes';
  if (table === schema.productVariations || table?.name === 'product_variations') return 'productVariations';
  if (table === schema.productVariationOptions || table?.name === 'product_variation_options') return 'productVariationOptions';
  if (table === schema.apiSyncs || table?.name === 'api_syncs') return 'apiSyncs';
  if (table === schema.productApiConfigs || table?.name === 'product_api_configs') return 'productApiConfigs';
  if (table === schema.syndicationLogs || table?.name === 'syndication_logs') return 'syndicationLogs';
  if (table === schema.channelProducts || table?.name === 'channel_products') return 'channelProducts';
  return null;
}

// Helper to extract value from Drizzle condition
function extractConditionValue(condition: any): any {
  if (condition && condition.sql) {
    const values = condition.values || [];
    return values[0];
  }
  return null;
}

// Helper to filter data based on conditions
function filterData(data: any[], conditions: any[]): any[] {
  if (conditions.length === 0) return data;
  
  return data.filter(item => {
    return conditions.every(condition => {
      // Handle Drizzle eq() conditions
      if (condition && condition.sql) {
        // Try to parse the SQL to find the field name
        const sqlStr = condition.sql.toString();
        const values = condition.values || [];
        
        // Simple pattern matching for common conditions
        if (sqlStr.includes('email') && values[0]) {
          return item.email === values[0];
        }
        if (sqlStr.includes('ownerId') && values[0]) {
          return item.ownerId === values[0];
        }
        if (sqlStr.includes('brandId') && values[0]) {
          return item.brandId === values[0];
        }
        if (sqlStr.includes('id') && values[0]) {
          return item.id === values[0];
        }
      }
      
      // Handle function conditions
      if (typeof condition === 'function') {
        return condition(item);
      }
      
      return true;
    });
  });
}

// Create mock database implementation
export function createMockDb() {
  return {
    select: (selectFields?: any) => {
      const queryBuilder: any = {
        _table: null,
        _conditions: [],
        _joins: [],
        _orderBy: null,
        _selectFields: selectFields,
        
        from: function(table: any) {
          this._table = table;
          return this;
        },
        
        where: function(condition: any) {
          if (condition) {
            this._conditions.push(condition);
          }
          return this;
        },
        
        leftJoin: function(table: any, condition: any) {
          this._joins.push({ table, condition, type: 'left' });
          return this;
        },
        
        orderBy: function(order: any) {
          this._orderBy = order;
          return this;
        },
        
        limit: async function(count: number) {
          const tableName = getTableName(this._table);
          if (!tableName) return [];
          
          let data = [...(mockData as any)[tableName]];
          
          // Apply filters
          data = filterData(data, this._conditions);
          
          // Handle joins (simplified)
          if (this._joins.length > 0 && tableName === 'products') {
            // Add brand name to products
            data = data.map(product => {
              const brand = mockData.brands.find(b => b.id === product.brandId);
              return { ...product, brandName: brand?.name };
            });
          }
          
          // Apply ordering (simplified - just reverse for desc)
          if (this._orderBy) {
            data.reverse();
          }
          
          // Apply limit
          return data.slice(0, count);
        },
        
        // Execute without limit
        execute: async function() {
          const tableName = getTableName(this._table);
          if (!tableName) return [];
          
          // Special handling for count queries
          if (this._selectFields && this._selectFields.count) {
            let data = [...(mockData as any)[tableName]];
            data = filterData(data, this._conditions);
            return [{ count: data.length }];
          }
          
          let data = [...(mockData as any)[tableName]];
          
          // Apply filters
          data = filterData(data, this._conditions);
          
          // Handle joins
          if (this._joins.length > 0 && tableName === 'products') {
            data = data.map(product => {
              const brand = mockData.brands.find(b => b.id === product.brandId);
              return { ...product, brandName: brand?.name };
            });
          }
          
          // Apply ordering
          if (this._orderBy) {
            data.reverse();
          }
          
          return data;
        },
        
        // Alias for execute
        then: async function(resolve: any, reject: any) {
          try {
            const result = await this.execute();
            if (resolve) resolve(result);
            return result;
          } catch (error) {
            if (reject) reject(error);
            throw error;
          }
        }
      };
      
      // If orderBy is called directly after select().from()
      queryBuilder.orderBy = queryBuilder.orderBy.bind(queryBuilder);
      queryBuilder.where = queryBuilder.where.bind(queryBuilder);
      queryBuilder.leftJoin = queryBuilder.leftJoin.bind(queryBuilder);
      
      return queryBuilder;
    },
    
    insert: (table: any) => ({
      values: (data: any) => ({
        returning: async () => {
          const tableName = getTableName(table);
          if (!tableName) return [];
          
          const now = new Date();
          const newItem = {
            ...data,
            createdAt: data.createdAt || now,
            updatedAt: data.updatedAt || now
          };
          
          // Add auto-increment ID if not provided
          if (tableName !== 'users' && !newItem.id) {
            newItem.id = getNextId(tableName);
          } else if (tableName === 'users' && !newItem.id) {
            newItem.id = `mock-user-${Math.random().toString(36).substr(2, 9)}`;
          }
          
          // Add to mock storage
          (mockData as any)[tableName].push(newItem);
          
          console.log(`Mock ${tableName} created:`, { id: newItem.id });
          
          return [newItem];
        },
        
        onConflictDoUpdate: () => ({
          target: () => ({
            set: async () => {
              // Simplified upsert - just return success
              return [{}];
            }
          })
        })
      })
    }),
    
    update: (table: any) => ({
      set: (updates: any) => ({
        where: (condition: any) => ({
          returning: async () => {
            const tableName = getTableName(table);
            if (!tableName) return [];
            
            const data = (mockData as any)[tableName];
            const value = extractConditionValue(condition);
            
            const index = data.findIndex((item: any) => {
              if (value !== null) {
                return item.id === value || item.email === value;
              }
              return false;
            });
            
            if (index !== -1) {
              data[index] = {
                ...data[index],
                ...updates,
                updatedAt: new Date()
              };
              return [data[index]];
            }
            
            return [];
          }
        })
      })
    }),
    
    delete: (table: any) => ({
      where: async (condition: any) => {
        const tableName = getTableName(table);
        if (!tableName) return;
        
        const data = (mockData as any)[tableName];
        const value = extractConditionValue(condition);
        
        if (value !== null) {
          const index = data.findIndex((item: any) => 
            item.id === value || item.email === value
          );
          
          if (index !== -1) {
            data.splice(index, 1);
          }
        }
      }
    })
  };
}

// Initialize sample data
export function initializeSampleData() {
  // Clear existing data
  Object.keys(mockData).forEach(key => {
    (mockData as any)[key] = [];
  });
  
  // Reset ID counters
  Object.keys(idCounters).forEach(key => {
    idCounters[key] = 1;
  });
  
  // Add test user (this would be created during registration)
  const testUser = {
    id: 'mock-user-test123',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    firstName: 'John',
    lastName: 'Doe',
    role: 'brand_owner',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  mockData.users.push(testUser);
  
  // Add sample brands
  const brands = [
    {
      id: getNextId('brands'),
      name: 'Kerouac Watches',
      slug: 'kerouac-watches',
      description: 'Luxury timepieces inspired by the spirit of adventure',
      story: 'Founded in 1957, Kerouac Watches embodies the free spirit of exploration...',
      category: 'Luxury Watches',
      logoUrl: 'https://via.placeholder.com/200x200?text=Kerouac',
      ownerId: testUser.id,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: getNextId('brands'),
      name: 'Aurora Cosmetics',
      slug: 'aurora-cosmetics',
      description: 'Natural beauty products for the modern woman',
      story: 'Aurora Cosmetics believes in enhancing natural beauty...',
      category: 'Beauty & Personal Care',
      logoUrl: 'https://via.placeholder.com/200x200?text=Aurora',
      ownerId: testUser.id,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: getNextId('brands'),
      name: 'TechFlow Electronics',
      slug: 'techflow-electronics',
      description: 'Innovative gadgets for the digital age',
      story: 'TechFlow brings cutting-edge technology to everyday life...',
      category: 'Electronics',
      logoUrl: 'https://via.placeholder.com/200x200?text=TechFlow',
      ownerId: testUser.id,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  mockData.brands.push(...brands);
  
  // Add sample products
  const products = [
    // Kerouac Watches products
    {
      id: getNextId('products'),
      name: 'Explorer Classic',
      slug: 'explorer-classic',
      shortDescription: 'Timeless elegance meets rugged durability',
      longDescription: 'The Explorer Classic combines Swiss precision with American adventure spirit...',
      story: 'Inspired by cross-country journeys...',
      brandId: 1,
      sku: 'KW-EXP-001',
      gtin: '1234567890123',
      status: 'active',
      isVariant: false,
      price: 2499.99,
      compareAtPrice: 2999.99,
      stock: 25,
      lowStockThreshold: 5,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: getNextId('products'),
      name: 'Dharma Chronograph',
      slug: 'dharma-chronograph',
      shortDescription: 'Precision timing for the modern explorer',
      longDescription: 'The Dharma Chronograph features multiple complications...',
      story: 'Named after Kerouac\'s "Dharma Bums"...',
      brandId: 1,
      sku: 'KW-DHR-001',
      gtin: '1234567890124',
      status: 'active',
      isVariant: false,
      price: 3499.99,
      compareAtPrice: 3999.99,
      stock: 15,
      lowStockThreshold: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: getNextId('products'),
      name: 'Beat Generation Limited',
      slug: 'beat-generation-limited',
      shortDescription: 'Limited edition tribute to the Beat Generation',
      longDescription: 'Only 100 pieces worldwide, each individually numbered...',
      story: 'Celebrating the literary movement...',
      brandId: 1,
      sku: 'KW-BGL-001',
      gtin: '1234567890125',
      status: 'active',
      isVariant: false,
      price: 5999.99,
      compareAtPrice: null,
      stock: 3,
      lowStockThreshold: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // Aurora Cosmetics products
    {
      id: getNextId('products'),
      name: 'Glow Serum',
      slug: 'glow-serum',
      shortDescription: 'Vitamin C brightening serum',
      longDescription: 'Our signature Glow Serum combines vitamin C with hyaluronic acid...',
      story: 'Developed over 2 years of research...',
      brandId: 2,
      sku: 'AC-GLS-001',
      gtin: '2234567890123',
      status: 'active',
      isVariant: false,
      price: 68.00,
      compareAtPrice: 85.00,
      stock: 150,
      lowStockThreshold: 20,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: getNextId('products'),
      name: 'Hydra Moisturizer',
      slug: 'hydra-moisturizer',
      shortDescription: '24-hour hydration cream',
      longDescription: 'Deep hydration without the heavy feel...',
      story: 'Inspired by Nordic skincare rituals...',
      brandId: 2,
      sku: 'AC-HYD-001',
      gtin: '2234567890124',
      status: 'active',
      isVariant: false,
      price: 52.00,
      compareAtPrice: 65.00,
      stock: 200,
      lowStockThreshold: 30,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // TechFlow Electronics products
    {
      id: getNextId('products'),
      name: 'AirFlow Pro Earbuds',
      slug: 'airflow-pro-earbuds',
      shortDescription: 'Premium wireless earbuds with ANC',
      longDescription: 'Experience crystal-clear audio with active noise cancellation...',
      story: 'Engineered for audiophiles...',
      brandId: 3,
      sku: 'TF-AFP-001',
      gtin: '3234567890123',
      status: 'active',
      isVariant: false,
      price: 249.99,
      compareAtPrice: 299.99,
      stock: 75,
      lowStockThreshold: 10,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: getNextId('products'),
      name: 'PowerHub 10000',
      slug: 'powerhub-10000',
      shortDescription: 'Ultra-fast charging power bank',
      longDescription: '10000mAh capacity with 65W fast charging...',
      story: 'Never run out of power again...',
      brandId: 3,
      sku: 'TF-PH1-001',
      gtin: '3234567890124',
      status: 'active',
      isVariant: false,
      price: 79.99,
      compareAtPrice: 99.99,
      stock: 120,
      lowStockThreshold: 15,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  mockData.products.push(...products);
  
  // Add some syndication logs for today
  const today = new Date();
  const syndicationLogs = [
    {
      id: getNextId('syndicationLogs'),
      productId: 1,
      channelId: 1,
      action: 'create',
      status: 'success',
      message: 'Product synced to Amazon',
      createdAt: today,
      updatedAt: today
    },
    {
      id: getNextId('syndicationLogs'),
      productId: 2,
      channelId: 1,
      action: 'update',
      status: 'success',
      message: 'Product updated on Amazon',
      createdAt: today,
      updatedAt: today
    },
    {
      id: getNextId('syndicationLogs'),
      productId: 4,
      channelId: 2,
      action: 'create',
      status: 'success',
      message: 'Product synced to Shopify',
      createdAt: today,
      updatedAt: today
    }
  ];
  
  mockData.syndicationLogs.push(...syndicationLogs);
  
  console.log('Sample data initialized:', {
    users: mockData.users.length,
    brands: mockData.brands.length,
    products: mockData.products.length,
    syndicationLogs: mockData.syndicationLogs.length
  });
}