import { useCallback, useEffect, useState } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import Layout from "./components/Layout";
import { DbProvider } from "./lib/db-context";
import { getSecret, SECRET_KEYS } from "./lib/secrets";
import AddPurchase from "./pages/AddPurchase";
import ComingSoon from "./pages/ComingSoon";
import Home from "./pages/Home";
import Items from "./pages/Items";
import Lock from "./pages/Lock";
import Purchases from "./pages/Purchases";
import Settings from "./pages/Settings";
import Setup from "./pages/Setup";
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

  if (phase === "loading") {
    return <main className="p-8 text-sm text-gray-500">Loading…</main>;
  }

  if (phase === "setup") {
    return <Setup onDone={() => void bootstrap()} />;
  }

  if (phase === "lock") {
    return <Lock onUnlock={() => setPhase("home")} />;
  }

  return (
    <DbProvider url={url}>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="items" element={<Items />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="purchases/new" element={<AddPurchase />} />
            <Route path="stock-check" element={<ComingSoon title="Stock Check" />} />
            <Route path="expenses" element={<ComingSoon title="Expenses" />} />
            <Route path="reports" element={<ComingSoon title="Reports" />} />
            <Route
              path="settings"
              element={
                <Settings
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
