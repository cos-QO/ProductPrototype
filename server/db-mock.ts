// Mock database for UI testing without actual database
import * as schema from "@shared/schema";

// Create a mock db object that returns empty results
export const db = new Proxy({}, {
  get: () => {
    return new Proxy({}, {
      get: () => {
        // Return chainable mock methods
        return () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
          limit: () => Promise.resolve([]),
          then: (callback: any) => callback([]),
          catch: () => Promise.resolve([]),
          findFirst: () => Promise.resolve(null),
          findMany: () => Promise.resolve([]),
        });
      }
    });
  }
});

// Mock pool for compatibility
export const pool = {
  query: () => Promise.resolve({ rows: [] }),
  connect: () => Promise.resolve({
    query: () => Promise.resolve({ rows: [] }),
    release: () => Promise.resolve(),
  }),
};

console.log("⚠️  Running with mock database - no actual data will be persisted");