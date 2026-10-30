import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getDb, type Db } from "../db/client";

/**
 * Holds the live Drizzle handle for the unlocked session.
 * The URL only exists after the PIN has been accepted, so the db is never
 * constructed before unlock.
 */
type DbContextValue = { db: Db | null; url: string | null };

const DbContext = createContext<DbContextValue>({ db: null, url: null });

export function DbProvider({ url, children }: { url: string | null; children: ReactNode }) {
  const value = useMemo<DbContextValue>(
    () => ({ db: url ? getDb(url) : null, url }),
    [url],
  );
  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb(): Db {
  const { db } = useContext(DbContext);
  if (!db) {
    throw new Error("useDb() must be used inside <DbProvider> after unlock");
  }
  return db;
}

/** The connection URL, for flows that need a transactional (WebSocket) client. */
export function useDbUrl(): string {
  const { url } = useContext(DbContext);
  if (!url) {
    throw new Error("useDbUrl() must be used inside <DbProvider> after unlock");
  }
  return url;
}
