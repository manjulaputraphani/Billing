import { describe, expect, it } from "vitest";
import {
  batchPriceChangePct,
  batchProfitPaise,
  buildBatchRows,
  capitalTurnover,
  changeIndicator,
  daysToRotateCapital,
  grossProfitPaise,
  inventoryTurnover,
  netProfitPaise,
  periodRange,
  profitPct,
  remainingStockValuePaise,
} from "./analytics";

const KG = 1000; // base units (g) per priced unit (kg)

describe("periodRange", () => {
  const now = new Date("2026-11-04T10:30:00Z"); // a Wednesday

  it("today spans one day and yesterday is the previous period", () => {
    const p = periodRange("today", now);
    expect(p.start).toBe("2026-11-04");
    expect(p.end).toBe("2026-11-04");
    expect(p.days).toBe(1);
    expect(p.prevStart).toBe("2026-11-03");
    expect(p.prevEnd).toBe("2026-11-03");
  });

  it("this week starts Monday and mirrors the week before", () => {
    const p = periodRange("week", now);
    expect(p.start).toBe("2026-11-02"); // Monday
    expect(p.end).toBe("2026-11-04");
    expect(p.days).toBe(3);
    expect(p.prevStart).toBe("2026-10-30");
    expect(p.prevEnd).toBe("2026-11-01");
  });

  it("this month starts on the 1st", () => {
    const p = periodRange("month", now);
    expect(p.start).toBe("2026-11-01");
    expect(p.end).toBe("2026-11-04");
    expect(p.days).toBe(4);
    expect(p.prevStart).toBe("2026-10-28");
  });

  it("a custom range keeps its own length for the previous window", () => {
    const p = periodRange("custom", now, { from: "2026-10-10", to: "2026-10-19" });
    expect(p.days).toBe(10);
    expect(p.prevStart).toBe("2026-09-30");
    expect(p.prevEnd).toBe("2026-10-09");
  });
});

describe("changeIndicator (▲▼●)", () => {
  it("marks up and down with exact 2-decimal pct", () => {
    expect(changeIndicator(10000, 10200)).toEqual({ direction: "up", pct: 2 });
    expect(changeIndicator(20000, 20200)).toEqual({ direction: "up", pct: 1 });
    expect(changeIndicator(10200, 10000)).toEqual({ direction: "down", pct: -1.96 });
    expect(changeIndicator(150, 149)).toEqual({ direction: "down", pct: -0.67 });
  });

  it("is flat on equality and handles a zero baseline", () => {
    expect(changeIndicator(500, 500)).toEqual({ direction: "flat", pct: 0 });
    expect(changeIndicator(0, 0)).toEqual({ direction: "flat", pct: 0 });
    expect(changeIndicator(0, 800)).toEqual({ direction: "up", pct: 100 });
  });
});

describe("core formulas", () => {
  it("batch profit = (sell − buy) × qty sold from that batch", () => {
    expect(batchProfitPaise(12000, 10000, 8000, KG)).toBe(16000); // ₹160
    expect(batchProfitPaise(12500, 10000, 2000, KG)).toBe(5000); // ₹50
    expect(batchProfitPaise(12500, 10200, 3000, KG)).toBe(6900); // ₹69
  });

  it("gross = sales − COGS, net = gross − expenses, profit% = net ÷ COGS", () => {
    const sales = 27900 - 11900 + 27900; // arbitrary
    const gross = grossProfitPaise(27900, 11900);
    expect(gross).toBe(16000);
    const net = netProfitPaise(gross, 5000);
    expect(net).toBe(11000);
    expect(profitPct(net, 11900)).toBeCloseTo(92.44, 2);
    expect(sales).toBeGreaterThan(0);
  });

  it("capital turnover = net sales ÷ average capital", () => {
    expect(capitalTurnover(240000, 100000, 100000)).toBeCloseTo(2.4, 10);
    expect(capitalTurnover(240000, 0, 0)).toBe(0);
  });

  it("days to rotate capital = period days ÷ turnover (null without turnover)", () => {
    expect(daysToRotateCapital(30, 2.4)).toBeCloseTo(12.5, 10);
    expect(daysToRotateCapital(30, 0)).toBeNull();
  });

  it("inventory turnover = COGS ÷ average stock value", () => {
    expect(inventoryTurnover(11900, 5950, 5950)).toBe(2);
    expect(inventoryTurnover(11900, 0, 0)).toBe(0);
  });

  it("remaining stock value = remaining qty × batch buy price", () => {
    expect(remainingStockValuePaise(7000, 10200, KG)).toBe(71400); // 7 kg @ ₹102
    expect(remainingStockValuePaise(0, 10200, KG)).toBe(0);
  });

  it("price change between consecutive batches", () => {
    expect(batchPriceChangePct(10000, 10200)).toBeCloseTo(2, 10);
    expect(batchPriceChangePct(20000, 20200)).toBeCloseTo(1, 10);
    expect(batchPriceChangePct(0, 10200)).toBe(0);
  });
});

/** The sample scenario from the spec, in ₹ (prices stored ×100 as paise). */
describe("sample data — Items A & B, days 1–3", () => {
  const D1 = "2026-11-01";
  const D2 = "2026-11-02";
  const D3 = "2026-11-03";

  function scenarioFor(item: "A" | "B") {
    const isA = item === "A";
    const batches = [
      { id: 1, purchaseDate: D1, buyUnitPaise: isA ? 10000 : 20000, qtyOriginalBase: 10000, qtyRemainingBase: 10000 },
      { id: 2, purchaseDate: D2, buyUnitPaise: isA ? 10200 : 20200, qtyOriginalBase: 10000, qtyRemainingBase: 10000 },
    ];
    const takes = isA
      ? [
          { batchId: 1, saleDate: D2, qtyTakenBase: 8000, sellUnitPaise: 12000 },
          { batchId: 1, saleDate: D3, qtyTakenBase: 2000, sellUnitPaise: 12500 },
          { batchId: 2, saleDate: D3, qtyTakenBase: 3000, sellUnitPaise: 12500 },
        ]
      : [];
    return buildBatchRows(batches, takes, KG);
  }

  it("day-2 buy price shows ▲ 2.00% for Item A and ▲ 1.00% for Item B", () => {
    const a = scenarioFor("A");
    expect(a[0].priceChange).toEqual({ direction: "flat", pct: 0 });
    expect(a[1].priceChange).toEqual({ direction: "up", pct: 2 });
    const b = scenarioFor("B");
    expect(b[1].priceChange).toEqual({ direction: "up", pct: 1 });
  });

  it("day-2 sale of 8 kg comes from the day-1 batch, profit ₹160, 2 kg left", () => {
    const a = scenarioFor("A");
    const batch1 = a[0];
    expect(batch1.takes[0]).toMatchObject({ qtyTakenBase: 8000, saleDate: D2 });
    expect(batchProfitPaise(12000, 10000, 8000, KG)).toBe(16000);
    expect(batch1.qtySoldBase).toBe(10000); // 8 + 2 (day-3 take finishes it)
    expect(batch1.qtyRemainingBase).toBe(0);
  });

  it("day-3 sale of 5 kg splits FIFO: ₹50 from batch 1 + ₹69 from batch 2", () => {
    const a = scenarioFor("A");
    expect(batchProfitPaise(12500, 10000, 2000, KG)).toBe(5000);
    expect(batchProfitPaise(12500, 10200, 3000, KG)).toBe(6900);
    expect(a[0].takes.find((t) => t.saleDate === D3)?.qtyTakenBase).toBe(2000);
    expect(a[1].takes.find((t) => t.saleDate === D3)?.qtyTakenBase).toBe(3000);
  });

  it("remaining stock of A = 7 kg, all from the day-2 batch (batch 1 sold out)", () => {
    const a = scenarioFor("A");
    expect(a[0].status).toBe("sold out");
    expect(a[0].remainingValuePaise).toBe(0);
    expect(a[1].qtyRemainingBase).toBe(7000);
    expect(a[1].remainingValuePaise).toBe(71400);
    expect(a[1].status).toBe("open");
    const totalRemaining = a.reduce((sum, row) => sum + row.qtyRemainingBase, 0);
    expect(totalRemaining).toBe(7000); // 7 kg
  });

  it("gross profit, expense and net profit tie out (gross − 50)", () => {
    // Item A sales: 8kg@120 + 5kg@125 = ₹1585; FIFO COGS = 10kg@100 + 3kg@102 = ₹1306
    const netSales = 96_000 + 62_500;
    const cogs = 100_000 + 30_600;
    const gross = grossProfitPaise(netSales, cogs);
    expect(gross).toBe(27_900); // ₹279 = 160 + 50 + 69
    const net = netProfitPaise(gross, 5000);
    expect(net).toBe(22_900); // ₹229 = 279 − 50
    // Batch profits sum to the gross profit.
    const a = scenarioFor("A");
    const batchProfits = a.reduce((sum, row) => sum + row.profitPaise, 0);
    expect(batchProfits).toBe(gross);
  });

  it("sell vs buy indicator on batch rows", () => {
    const a = scenarioFor("A");
    expect(a[0].sellVsBuy).toEqual({ direction: "up", pct: 21 }); // avg sell ₹121 vs buy ₹100
    expect(a[1].avgSellUnitPaise).toBe(12500);
  });
});