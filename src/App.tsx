import { useCallback, useEffect, useState } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import Layout from "./components/Layout";
import { DbProvider } from "./lib/db-context";
import { getSecret, SECRET_KEYS } from "./lib/secrets";
import { getDb } from "./db/client";
import { logActivity } from "./db/activity";
import AddPurchase from "./pages/AddPurchase";
import Billing from "./pages/Billing";
import Bills from "./pages/Bills";
import Chat from "./pages/Chat";
import ComingSoon from "./pages/ComingSoon";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Items from "./pages/Items";
import Lock from "./pages/Lock";
import Purchases from "./pages/Purchases";
import Sales from "./pages/Sales";
import Settings from "./pages/Settings";
import Setup from "./pages/Setup";
import StockCheck from "./pages/StockCheck";
import Suggestions from "./pages/Suggestions";
type Phase = "loading" | "setup" | "lock" | "home";

export default function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [url, setUrl] = useState<string | null>(null);

  /** No saved connection → setup. Saved connection → ask for the PIN. */
  const bootstrap = useCallback(async () => {
    try {
      const savedUrl = await getSecret(SECRET_KEYS.DATABASE_URL);
      const savedHash = await getSecret(SECRET_KEYS.PIN_HASH);
      if (savedUrl && savedHash) {
        setUrl(savedUrl);
        setPhase("lock");
      } else {
        setUrl(null);
        setPhase("setup");
      }
    } catch {
      // Keychain unreachable → let the user set things up again.
      setUrl(null);
      setPhase("setup");
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  /** Successful PIN entry → record the login, then show the app. */
  const unlock = useCallback(async () => {
    try {
      if (url) {
        await logActivity(getDb(url), { event: "login", summary: "Unlocked the app" });
      }
    } catch {
      // Audit logging must never block a login.
    }
    setPhase("home");
  }, [url]);

  if (phase === "loading") {
    return <main className="p-8 text-sm text-gray-500">Loading…</main>;
  }

  if (phase === "setup") {
    return <Setup onDone={() => void bootstrap()} />;
  }

  if (phase === "lock") {
    return <Lock onUnlock={() => void unlock()} />;
  }

  return (
    <DbProvider url={url}>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="items" element={<Items />} />
            <Route path="suggestions" element={<Suggestions />} />
            <Route path="chat" element={<Chat />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="purchases/new" element={<AddPurchase />} />
            <Route path="stock-check" element={<StockCheck />} />
            <Route path="billing" element={<Billing />} />
            <Route path="bills" element={<Bills />} />
            <Route path="sales" element={<Sales />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<ComingSoon title="Reports" />} />
            <Route
              path="settings"
              element={
                <Settings
                  onLock={() => setPhase("lock")}
                  onReset={() => {
                    setUrl(null);
                    setPhase("setup");
                  }}
                />
              }
            />
            <Route path="*" element={<ComingSoon title="Not found" />} />
          </Route>
        </Routes>
      </HashRouter>
    </DbProvider>
  );
}
