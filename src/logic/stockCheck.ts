import { StockLeftTooHighError, ValidationError } from "./errors";

/**
 * How much was consumed between the recorded stock and what is left now.
 * left > current usually means a purchase was never entered.
 */
export function computeUsage(currentStock: number, enteredLeft: number): number {
  if (!Number.isInteger(currentStock) || currentStock < 0) {
    throw new ValidationError("Current stock must be a whole number of base units");
  }
  if (!Number.isInteger(enteredLeft)) {
    throw new ValidationError("Stock left must be a whole number of base units");
  }
  if (enteredLeft < 0) {
    throw new ValidationError("Stock left cannot be negative");
  }
  if (enteredLeft > currentStock) {
    throw new StockLeftTooHighError(currentStock);
  }
  return currentStock - enteredLeft;
}
