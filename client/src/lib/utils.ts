import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats price from cents to dollars with currency symbol
 * @param cents - Price in cents (e.g., 77900 = $779.00)
 * @param currency - Currency symbol (default: '$')
 * @returns Formatted price string (e.g., '$779')
 */
export function formatPrice(
  cents: number | null | undefined,
  currency: string = "$",
): string {
  if (cents === null || cents === undefined) {
    return "Price TBD";
  }

  const dollars = cents / 100;

  // Format without decimals if it's a whole number, with decimals if needed
  if (dollars % 1 === 0) {
    return `${currency}${dollars.toLocaleString()}`;
  } else {
    return `${currency}${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

/**
 * Formats stock levels with status indicators
 * @param stock - Current stock level
 * @param lowStockThreshold - Threshold for low stock warning (optional)
 * @returns Object with formatted stock text and status
 */
export function formatStock(
  stock: number | null | undefined,
  lowStockThreshold?: number | null,
): {
  text: string;
  status: "in-stock" | "low-stock" | "out-of-stock" | "unknown";
  color: string;
} {
  if (stock === null || stock === undefined) {
    return {
      text: "Stock TBD",
      status: "unknown",
      color: "text-muted-foreground",
    };
  }

  if (stock === 0) {
    return {
      text: "Out of Stock",
      status: "out-of-stock",
      color: "text-destructive",
    };
  }

  if (lowStockThreshold && stock <= lowStockThreshold) {
    return {
      text: `${stock.toLocaleString()} left`,
      status: "low-stock",
      color: "text-warning",
    };
  }

  return {
    text: stock.toLocaleString(),
    status: "in-stock",
    color: "text-success",
  };
}
