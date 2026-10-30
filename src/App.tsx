import { useCallback, useEffect, useState } from "react";
import "./App.css";
import Setup from "./pages/Setup";
import Lock from "./pages/Lock";
import Home from "./pages/Home";
import { DbProvider } from "./lib/db-context";
import { getSecret, SECRET_KEYS } from "./lib/secrets";

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
      <Home
        onReset={() => {
          setUrl(null);
          setPhase("setup");
        }}
      />
    </DbProvider>
  );
}
