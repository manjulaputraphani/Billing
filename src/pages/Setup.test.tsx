import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Setup from "./Setup";
import { pingDb } from "../db/client";
import { saveSecret } from "../lib/secrets";

vi.mock("../db/client", () => ({ pingDb: vi.fn() }));
vi.mock("../lib/secrets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/secrets")>();
  return {
    ...actual,
    saveSecret: vi.fn(),
  };
});

const URL = "postgresql://user:pass@ep-test.neon.tech/db";

function renderPage() {
  const onDone = vi.fn();
  render(<Setup onDone={onDone} />);
  return onDone;
}

beforeEach(() => {
  vi.mocked(saveSecret).mockReset().mockResolvedValue(undefined);
  vi.mocked(pingDb).mockReset().mockResolvedValue(undefined);
});

describe("Setup", () => {
  it("asks only for the database connection (no PIN)", async () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Set up Stock Tracker" })).toBeInTheDocument();
    expect(screen.getByLabelText("Neon connection string")).toBeInTheDocument();
    expect(screen.queryByLabelText(/pin/i)).not.toBeInTheDocument();
  });

  it("shows the host after a successful test connection", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Neon connection string"), URL);
    await user.click(screen.getByRole("button", { name: "Test connection" }));
    expect(await screen.findByText(/Connected to ep-test\.neon\.tech/)).toBeInTheDocument();
  });

  it("reports a failed connection", async () => {
    vi.mocked(pingDb).mockRejectedValue(new Error("no"));
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Neon connection string"), URL);
    await user.click(screen.getByRole("button", { name: "Test connection" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Cannot connect");
  });

  it("saves only the database URL and continues", async () => {
    const onDone = renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Neon connection string"), URL);
    await user.click(screen.getByRole("button", { name: "Save & continue" }));

    expect(saveSecret).toHaveBeenCalledTimes(1);
    expect(saveSecret).toHaveBeenCalledWith("DATABASE_URL", URL);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
