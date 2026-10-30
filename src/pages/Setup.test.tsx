import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Setup from "./Setup";
import { hashPin, saveSecret } from "../lib/secrets";
import { pingDb } from "../db/client";

vi.mock("../lib/secrets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/secrets")>();
  return {
    ...actual,
    saveSecret: vi.fn(),
    getSecret: vi.fn(),
    deleteSecret: vi.fn(),
    hashPin: vi.fn(),
    verifyPin: vi.fn(),
  };
});

vi.mock("../db/client", () => ({ pingDb: vi.fn(), getDb: vi.fn() }));

const NEON_URL =
  "postgresql://user:secret@ep-test-host-1234-pooler.us-east-1.aws.neon.tech/db?sslmode=require";

async function fill(form: { url?: string; pin?: string; confirm?: string }) {
  const user = userEvent.setup();
  if (form.url !== undefined) {
    await user.type(screen.getByLabelText("Neon connection string"), form.url);
  }
  if (form.pin !== undefined) await user.type(screen.getByLabelText("PIN"), form.pin);
  if (form.confirm !== undefined) {
    await user.type(screen.getByLabelText("Confirm PIN"), form.confirm);
  }
  return user;
}

describe("Setup", () => {
  beforeEach(() => {
    vi.mocked(saveSecret).mockReset().mockResolvedValue(undefined);
    vi.mocked(hashPin).mockReset().mockResolvedValue("$argon2id$stub");
    vi.mocked(pingDb).mockReset().mockResolvedValue(undefined);
  });

  it("shows 'PINs do not match' and saves nothing", async () => {
    const onDone = vi.fn();
    render(<Setup onDone={onDone} />);
    const user = await fill({ url: NEON_URL, pin: "1234", confirm: "4321" });

    await user.click(screen.getByRole("button", { name: /save & continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("PINs do not match");
    expect(saveSecret).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("rejects a PIN that is not 4-6 digits", async () => {
    render(<Setup onDone={vi.fn()} />);
    const user = await fill({ url: NEON_URL, pin: "12", confirm: "12" });

    await user.click(screen.getByRole("button", { name: /save & continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("PIN must be 4-6 digits");
    expect(saveSecret).not.toHaveBeenCalled();
  });

  it("shows 'Cannot connect' when the connection test fails", async () => {
    vi.mocked(pingDb).mockRejectedValue(new Error("network down"));
    render(<Setup onDone={vi.fn()} />);
    const user = await fill({ url: NEON_URL });

    await user.click(screen.getByRole("button", { name: /test connection/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cannot connect - check the connection string",
    );
  });

  it("on success stores the URL + PIN hash and never shows the full URL", async () => {
    const onDone = vi.fn();
    render(<Setup onDone={onDone} />);
    const user = await fill({ url: NEON_URL, pin: "123456", confirm: "123456" });

    await user.click(screen.getByRole("button", { name: /test connection/i }));
    expect(await screen.findByRole("status")).toHaveTextContent("ep-test-host-1234-pooler");
    expect(screen.getByRole("status")).not.toHaveTextContent("secret");

    await user.click(screen.getByRole("button", { name: /save & continue/i }));

    expect(saveSecret).toHaveBeenCalledWith("DATABASE_URL", NEON_URL);
    expect(hashPin).toHaveBeenCalledWith("123456");
    expect(saveSecret).toHaveBeenCalledWith("PIN_HASH", "$argon2id$stub");
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
