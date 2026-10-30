import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getDb, type Db } from "../db/client";

/**
 * Holds the live Drizzle handle for the unlocked session.
 * The URL only exists after the PIN has been accepted, so the db is never
 * constructed before unlock.
 */
const DbContext = createContext<Db | null>(null);

export function DbProvider({ url, children }: { url: string | null; children: ReactNode }) {
  const db = useMemo(() => (url ? getDb(url) : null), [url]);
  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

export function useDb(): Db {
  const db = useContext(DbContext);
  if (!db) {
    throw new Error("useDb() must be used inside <DbProvider> after unlock");
  }
  return db;
}
