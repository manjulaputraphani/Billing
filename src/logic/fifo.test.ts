import { describe, it, expect } from "vitest";
import { allocateFifo, type FifoBatch } from "./fifo";
import { InsufficientStockError, ValidationError } from "./errors";

const b = (
  id: number,
  qtyRemaining: number,
  unitPricePaise: number,
  purchaseDate: string,
): FifoBatch => ({ id, qtyRemaining, unitPricePaise, purchaseDate });

describe("allocateFifo — docs/TESTING.md §A2", () => {
  it("worked example: A 1000g@1000 + B 3000g@1200, used 2000 → 2200", () => {
    const batches = [b(1, 1000, 1000, "2026-10-01"), b(2, 3000, 1200, "2026-10-02")];
    const result = allocateFifo(batches, 2000, 1000);

    expect(result.takes).toEqual([
      { batchId: 1, qty: 1000, unitPricePaise: 1000, costPaise: 1000 },
      { batchId: 2, qty: 1000, unitPricePaise: 1200, costPaise: 1200 },
    ]);
    expect(result.totalCostPaise).toBe(2200);

    // B keeps the rest: 3000 − 1000 taken.
    const takenFromB = result.takes.find((t) => t.batchId === 2)?.qty ?? 0;
    expect(3000 - takenFromB).toBe(2000);
  });

  it("single batch: 5000g@1000, used 4000 → 4000", () => {
    const result = allocateFifo([b(1, 5000, 1000, "2026-10-01")], 4000, 1000);
    expect(result.takes).toHaveLength(1);
    expect(result.takes[0].qty).toBe(4000);
    expect(result.totalCostPaise).toBe(4000);
  });

  it("empties a batch exactly: A 1000@1000, used 1000 → cost 1000", () => {
    const result = allocateFifo([b(1, 1000, 1000, "2026-10-01")], 1000, 1000);
    expect(result.takes).toEqual([
      { batchId: 1, qty: 1000, unitPricePaise: 1000, costPaise: 1000 },
    ]);
  });

  it("zero used → no takes, no cost", () => {
    const result = allocateFifo([b(1, 1000, 1000, "2026-10-01")], 0, 1000);
    expect(result.takes).toEqual([]);
    expect(result.totalCostPaise).toBe(0);
  });

  it("too much → InsufficientStockError", () => {
    const batches = [b(1, 2000, 1000, "2026-10-01"), b(2, 2000, 1200, "2026-10-02")];
    expect(() => allocateFifo(batches, 5000, 1000)).toThrow(InsufficientStockError);
  });

  it("takes oldest first even when the array lists newer first", () => {
    const batches = [b(2, 1000, 1200, "2026-10-05"), b(1, 1000, 1000, "2026-10-01")];
    const result = allocateFifo(batches, 500, 1000);
    expect(result.takes[0].batchId).toBe(1);
    expect(result.takes[0].unitPricePaise).toBe(1000);
  });

  it("orders by id when dates are equal", () => {
    const batches = [b(2, 1000, 1200, "2026-10-01"), b(1, 1000, 1000, "2026-10-01")];
    const result = allocateFifo(batches, 500, 1000);
    expect(result.takes[0].batchId).toBe(1);
  });

  it("skips batches with nothing left", () => {
    const batches = [b(1, 0, 1000, "2026-10-01"), b(2, 1000, 1200, "2026-10-02")];
    const result = allocateFifo(batches, 500, 1000);
    expect(result.takes).toHaveLength(1);
    expect(result.takes[0].batchId).toBe(2);
    expect(result.totalCostPaise).toBe(600);
  });

  it("handles pieces (factor 1)", () => {
    const result = allocateFifo([b(1, 10, 500, "2026-10-01")], 3, 1);
    expect(result.totalCostPaise).toBe(1500);
  });

  it("rounds each take to the nearest paise", () => {
    // 250 g @ ₹12/kg = 300 paise exactly; 1 g @ ₹1.50/kg = 0.15 → 0
    expect(allocateFifo([b(1, 1000, 1200, "2026-10-01")], 250, 1000).totalCostPaise).toBe(300);
    expect(allocateFifo([b(1, 1000, 150, "2026-10-01")], 1, 1000).totalCostPaise).toBe(0);
  });

  it("rejects a negative quantity", () => {
    expect(() => allocateFifo([b(1, 1000, 1000, "2026-10-01")], -1, 1000)).toThrow(ValidationError);
  });

  it("rejects a non-positive factor", () => {
    expect(() => allocateFifo([b(1, 1000, 1000, "2026-10-01")], 1, 0)).toThrow(ValidationError);
  });

  it("never returns float money", () => {
    const result = allocateFifo([b(1, 3333, 777, "2026-10-01")], 777, 1000);
    expect(Number.isInteger(result.totalCostPaise)).toBe(true);
    expect(result.takes.every((t) => Number.isInteger(t.qty) && Number.isInteger(t.costPaise))).toBe(
      true,
    );
  });
});
