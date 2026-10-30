import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Settings from "./Settings";
import { DbProvider } from "../lib/db-context";
import { deleteSecret, getSecret, hashPin, saveSecret, verifyPin } from "../lib/secrets";

vi.mock("../db/client", () => ({
  getDb: vi.fn(() => ({})),
  getTxDb: vi.fn(),
  withTransaction: vi.fn(),
  pingDb: vi.fn(),
}));
vi.mock("../db/settings", () => ({
  DEFAULT_AI_CONFIG: { enabled: false, mode: "local", model: "glm-5.3-flash:cloud" },
  getAiConfig: vi.fn(async () => ({ enabled: false, mode: "local", model: "glm-5.3-flash:cloud" })),
  saveAiConfig: vi.fn(async () => {}),
}));
vi.mock("../lib/secrets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/secrets")>();
  return {
    ...actual,
    getSecret: vi.fn(),
    saveSecret: vi.fn(),
    deleteSecret: vi.fn(),
    hashPin: vi.fn(),
    verifyPin: vi.fn(),
  };
});
vi.mock("@tauri-apps/api/app", () => ({ getVersion: vi.fn(async () => "1.0.0") }));
vi.mock("../ai/ollama", () => ({ chat: vi.fn() }));

const URL = "postgresql://user:pass@localhost:5432/test";

function renderPage(onLock = vi.fn()) {
  render(
    <DbProvider url={URL}>
      <Settings onReset={vi.fn()} onLock={onLock} />
    </DbProvider>,
  );
  return onLock;
}

beforeEach(() => {
  vi.mocked(getSecret).mockReset().mockImplementation(async (key) =>
    key === "OLLAMA_API_KEY" ? null : "saved",
  );
  vi.mocked(saveSecret).mockReset().mockResolvedValue(undefined);
  vi.mocked(deleteSecret).mockReset().mockResolvedValue(undefined);
  vi.mocked(hashPin).mockReset().mockResolvedValue("$argon2id$new-hash");
  vi.mocked(verifyPin).mockReset().mockResolvedValue(true);
});

describe("Settings — security", () => {
  it("shows what is stored in the keychain without revealing values", async () => {
    renderPage();
    expect(await screen.findByText(/PIN: set/)).toBeInTheDocument();
    expect(screen.getByText(/Database connection: saved/)).toBeInTheDocument();
    expect(screen.getByText(/AI cloud key: not saved/)).toBeInTheDocument();
    expect(screen.queryByText("saved", { exact: true })).not.toBeInTheDocument();
  });

  it("locks the app on 'Lock now'", async () => {
    const onLock = renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Lock now" }));
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it("changes the PIN after checking the current one", async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByText(/PIN: set/);

    await user.type(screen.getByLabelText("Current PIN"), "1234");
    await user.type(screen.getByLabelText("New PIN"), "5678");
    await user.type(screen.getByLabelText("Confirm new PIN"), "5678");
    await user.click(screen.getByRole("button", { name: "Update PIN" }));

    expect(verifyPin).toHaveBeenCalledWith("1234", "saved");
    expect(hashPin).toHaveBeenCalledWith("5678");
    expect(saveSecret).toHaveBeenCalledWith("PIN_HASH", "$argon2id$new-hash");
    expect(await screen.findByText("PIN updated")).toBeInTheDocument();
  });

  it("refuses a wrong current PIN", async () => {
    vi.mocked(verifyPin).mockResolvedValue(false);
    renderPage();
    const user = userEvent.setup();
    await screen.findByText(/PIN: set/);

    await user.type(screen.getByLabelText("Current PIN"), "0000");
    await user.type(screen.getByLabelText("New PIN"), "5678");
    await user.type(screen.getByLabelText("Confirm new PIN"), "5678");
    await user.click(screen.getByRole("button", { name: "Update PIN" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Current PIN is incorrect");
    expect(saveSecret).not.toHaveBeenCalled();
  });

  it("validates the new PIN format and match", async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByText(/PIN: set/);

    await user.type(screen.getByLabelText("Current PIN"), "1234");
    await user.type(screen.getByLabelText("New PIN"), "12");
    await user.type(screen.getByLabelText("Confirm new PIN"), "12");
    await user.click(screen.getByRole("button", { name: "Update PIN" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("PIN must be 4-6 digits");

    await user.clear(screen.getByLabelText("New PIN"));
    await user.clear(screen.getByLabelText("Confirm new PIN"));
    await user.type(screen.getByLabelText("New PIN"), "5678");
    await user.type(screen.getByLabelText("Confirm new PIN"), "8765");
    await user.click(screen.getByRole("button", { name: "Update PIN" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("PINs do not match");
  });

  it("removes the saved AI key", async () => {
    vi.mocked(getSecret).mockImplementation(async (key) =>
      key === "OLLAMA_API_KEY" ? "secret-key" : "saved",
    );
    renderPage();
    const user = userEvent.setup();

    expect(await screen.findByText(/AI cloud key: saved/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove key" }));

    expect(deleteSecret).toHaveBeenCalledWith("OLLAMA_API_KEY");
    expect(await screen.findByText(/AI cloud key: not saved/)).toBeInTheDocument();
  });
});
