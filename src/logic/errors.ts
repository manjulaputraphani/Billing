/** Domain errors — plain classes so callers can tell user mistakes from real faults. */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class InsufficientStockError extends Error {
  constructor(message = "Not enough stock for this entry") {
    super(message);
    this.name = "InsufficientStockError";
  }
}

export class StockLeftTooHighError extends Error {
  constructor(currentStock: number) {
    super(
      `Stock left is more than current stock (${currentStock}). Did you miss a purchase?`,
    );
    this.name = "StockLeftTooHighError";
  }
}
