import { inArray } from "drizzle-orm";
import type { Db } from "./client";
import { settings } from "./schema";
import type { OllamaMode } from "../ai/ollama";

export type ShopDetails = {
  name: string;
  address: string;
  phone: string;
  gstin: string;
};

export const DEFAULT_SHOP: ShopDetails = { name: "", address: "", phone: "", gstin: "" };

const SHOP_KEYS = ["shop_name", "shop_address", "shop_phone", "shop_gstin"] as const;

/** Shop header printed on GST bills (Settings → Shop details). */
export async function getShopDetails(db: Db): Promise<ShopDetails> {
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, [...SHOP_KEYS]));
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return {
    name: map.get("shop_name") ?? DEFAULT_SHOP.name,
    address: map.get("shop_address") ?? DEFAULT_SHOP.address,
    phone: map.get("shop_phone") ?? DEFAULT_SHOP.phone,
    gstin: map.get("shop_gstin") ?? DEFAULT_SHOP.gstin,
  };
}

export async function saveShopDetails(db: Db, shop: ShopDetails): Promise<void> {
  const pairs: [string, string][] = [
    [SHOP_KEYS[0], shop.name.trim()],
    [SHOP_KEYS[1], shop.address.trim()],
    [SHOP_KEYS[2], shop.phone.trim()],
    [SHOP_KEYS[3], shop.gstin.trim().toUpperCase()],
  ];
  for (const [key, value] of pairs) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }
}

export type AiConfig = {
  enabled: boolean;
  mode: OllamaMode;
  model: string;
};

export const DEFAULT_AI_CONFIG: AiConfig = {
  enabled: false,
  mode: "local",
  model: "glm-5.3-flash:cloud",
};

const KEYS = ["ai_enabled", "ai_mode", "ai_model"] as const;

export async function getAiConfig(db: Db): Promise<AiConfig> {
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, [...KEYS]));

  const map = new Map(rows.map((row) => [row.key, row.value]));
  const mode = map.get("ai_mode");
  return {
    enabled: map.get("ai_enabled") === "1",
    mode: mode === "cloud" ? "cloud" : "local",
    model: map.get("ai_model") || DEFAULT_AI_CONFIG.model,
  };
}

export async function saveAiConfig(db: Db, config: AiConfig): Promise<void> {
  const rows = [
    { key: "ai_enabled", value: config.enabled ? "1" : "0" },
    { key: "ai_mode", value: config.mode },
    { key: "ai_model", value: config.model },
  ];
  for (const row of rows) {
    await db
      .insert(settings)
      .values(row)
      .onConflictDoUpdate({ target: settings.key, set: { value: row.value } });
  }
}
