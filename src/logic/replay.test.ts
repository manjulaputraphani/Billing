import { describe, it, expect } from "vitest";
import { replayItem, type ReplayBatch, type ReplayMovement } from "./replay";
import { ReplayConflictError } from "./errors";

const batch = (
  id: number,
  qtyOriginal: number,
  unitPricePaise: number,
  purchaseDate: string,
): ReplayBatch => ({ id, qtyOriginal, unitPricePaise, purchaseDate });

const move = (
  id: number,
  type: ReplayMovement["type"],
  movementDate: string,
  qtyChange: number,
  enteredQtyLeft: number | null = null,
): ReplayMovement => ({ id, type, movementDate, qtyChange, enteredQtyLeft });

/** The BLUEPRINT §5 worked example, as used by TESTING §B3. */
const AB = [batch(1, 1000, 1000, "2026-10-01"), batch(2, 3000, 1200, "2026-10-02")];

describe("replayItem", () => {
  it("recomputes the worked example: used 2000 → cost 2200", () => {
    const result = replayItem(AB, [move(10, "STOCK_CHECK", "2026-10-05", -2000, 2000)], 1000);

    expect(result.movements).toEqual([{ id: 10, qtyChange: -2000, costPaise: 2200 }]);
    expect(result.batches).toEqual([
      { id: 1, qtyRemaining: 0 },
      { id: 2, qtyRemaining: 2000 },
    ]);
    expect(result.links).toHaveLength(2);
    expect(result.links[0]).toMatchObject({ movementId: 10, batchId: 1, qtyTaken: 1000, costPaise: 1000 });
    expect(result.links[1]).toMatchObject({ movementId: 10, batchId: 2, qtyTaken: 1000, costPaise: 1200 });
  });

  it("B3: editing the first purchase ₹10 → ₹11 makes the cost 2300", () => {
    const edited = [batch(1, 1000, 1100, "2026-10-01"), batch(2, 3000, 1200, "2026-10-02")];
    const result = replayItem(edited, [move(10, "STOCK_CHECK", "2026-10-05", -2000, 2000)], 1000);

    expect(result.movements[0].costPaise).toBe(2300);
    expect(result.batches).toEqual([
      { id: 1, qtyRemaining: 0 },
      { id: 2, qtyRemaining: 2000 },
    ]);
    expect(result.links.map((l) => l.costPaise)).toEqual([1100, 1200]);
  });

  it("replays several movements in date order", () => {
    const movements = [
      move(11, "USAGE", "2026-10-10", -500),
      move(10, "STOCK_CHECK", "2026-10-05", -2000, 2000),
    ];
    const result = replayItem(AB, movements, 1000);

    // 2000 taken first (A 1000 + B 1000), then 500 more from B.
    expect(result.movements.map((m) => m.id)).toEqual([10, 11]);
    expect(result.movements[0].costPaise).toBe(2200);
    expect(result.movements[1].costPaise).toBe(600);
    expect(result.batches).toEqual([
      { id: 1, qtyRemaining: 0 },
      { id: 2, qtyRemaining: 1500 },
    ]);
    expect(result.links).toHaveLength(3);
  });

  it("supports USAGE and WASTAGE entering the quantity directly", () => {
    const result = replayItem(AB, [move(20, "WASTAGE", "2026-10-06", -300)], 1000);
    expect(result.movements[0]).toEqual({ id: 20, qtyChange: -300, costPaise: 300 });
    expect(result.batches[0].qtyRemaining).toBe(700);
  });

  it("ignores PURCHASE movements (batches start at qty_original)", () => {
    const withPurchase = [move(1, "PURCHASE", "2026-10-01", 1000), move(10, "STOCK_CHECK", "2026-10-05", -2000, 2000)];
    const result = replayItem(AB, withPurchase, 1000);
    expect(result.movements).toHaveLength(1);
    // The purchase movement is passed through untouched by the caller.
  });

  it("returns originals when there are no movements", () => {
    const result = replayItem(AB, [], 1000);
    expect(result.batches).toEqual([
      { id: 1, qtyRemaining: 1000 },
      { id: 2, qtyRemaining: 3000 },
    ]);
    expect(result.movements).toEqual([]);
    expect(result.links).toEqual([]);
  });

  it("reports which entry conflicts when a replay becomes impossible", () => {
    // A stock check saying "4000 left" cannot hold once batch A's 1000 units vanish.
    const onlyB = [batch(2, 3000, 1200, "2026-10-02")];
    expect(() => replayItem(onlyB, [move(10, "STOCK_CHECK", "2026-10-05", -2000, 4000)], 1000)).toThrow(
      ReplayConflictError,
    );
  });

  it("names the conflicting date in the error", () => {
    const onlyB = [batch(2, 3000, 1200, "2026-10-02")];
    try {
      replayItem(onlyB, [move(10, "STOCK_CHECK", "2026-10-05", -2000, 4000)], 1000);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as ReplayConflictError).movementDate).toBe("2026-10-05");
      expect((err as Error).message).toMatch(/2026-10-05/);
    }
  });
});
