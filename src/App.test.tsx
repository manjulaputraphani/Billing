import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { deleteSecret, getSecret, verifyPin } from "./lib/secrets";

vi.mock("./lib/secrets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./lib/secrets")>();
  return {
    ...actual,
    saveSecret: vi.fn(),
    getSecret: vi.fn(),
    deleteSecret: vi.fn(),
    hashPin: vi.fn(),
    verifyPin: vi.fn(),
  };
});

vi.mock("./db/client", () => ({ getDb: vi.fn(() => ({})), pingDb: vi.fn() }));

const SAVED_URL = "postgresql://user:secret@ep-host-1.neon.tech/db";
const HASH = "$argon2id$stored-hash";

function savedBoth() {
  vi.mocked(getSecret).mockImplementation(async (key) =>
    key === "DATABASE_URL" ? SAVED_URL : HASH,
  );
}

describe("App start flow", () => {
  beforeEach(() => {
    vi.mocked(getSecret).mockReset();
    vi.mocked(verifyPin).mockReset().mockResolvedValue(true);
    vi.mocked(deleteSecret).mockReset().mockResolvedValue(undefined);
  });

  it("shows Setup on first launch when nothing is saved", async () => {
    vi.mocked(getSecret).mockResolvedValue(null);
    render(<App />);

    expect(await screen.findByRole("heading", { name: /set up stock tracker/i })).toBeInTheDocument();
  });

  it("asks for the PIN (not the URL) when a connection is saved", async () => {
    savedBoth();
    render(<App />);

    expect(await screen.findByLabelText("PIN")).toBeInTheDocument();
    expect(screen.queryByLabelText("Neon connection string")).not.toBeInTheDocument();
  });

  it("goes to Home after the correct PIN", async () => {
    savedBoth();
    render(<App />);
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("PIN"), "1234");
    await user.click(screen.getByRole("button", { name: /unlock/i }));

    expect(await screen.findByText("Dashboard coming soon")).toBeInTheDocument();
  });

  it("resets the connection through an in-app modal, not window.confirm", async () => {
    savedBoth();
    const confirmSpy = vi.spyOn(window, "confirm");
    render(<App />);
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("PIN"), "1234");
    await user.click(screen.getByRole("button", { name: /unlock/i }));
    await screen.findByText("Dashboard coming soon");

    await user.click(screen.getByRole("button", { name: /reset connection/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /yes, reset/i }));

    expect(deleteSecret).toHaveBeenCalledWith("DATABASE_URL");
    expect(deleteSecret).toHaveBeenCalledWith("PIN_HASH");
    expect(await screen.findByRole("heading", { name: /set up stock tracker/i })).toBeInTheDocument();
    confirmSpy.mockRestore();
  });
});
