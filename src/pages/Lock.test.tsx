import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Lock from "./Lock";
import { getSecret, verifyPin } from "../lib/secrets";

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

describe("Lock", () => {
  beforeEach(() => {
    vi.mocked(getSecret).mockReset().mockResolvedValue("$argon2id$stored-hash");
    vi.mocked(verifyPin).mockReset();
  });

  it("shows an error for a wrong PIN and does not unlock", async () => {
    vi.mocked(verifyPin).mockResolvedValue(false);
    const onUnlock = vi.fn();
    render(<Lock onUnlock={onUnlock} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("PIN"), "1111");
    await user.click(screen.getByRole("button", { name: /unlock/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Wrong PIN/i);
    expect(onUnlock).not.toHaveBeenCalled();
  });

  it("locks out for a countdown after 5 wrong attempts", async () => {
    vi.mocked(verifyPin).mockResolvedValue(false);
    const onUnlock = vi.fn();
    render(<Lock onUnlock={onUnlock} />);
    const user = userEvent.setup();

    for (let attempt = 0; attempt < 5; attempt++) {
      await user.type(screen.getByLabelText("PIN"), "1111");
      await user.click(screen.getByRole("button", { name: /unlock/i }));
      await screen.findByRole("alert");
    }

    expect(await screen.findByRole("alert")).toHaveTextContent(/Try again in \d+s/i);
    expect(screen.getByRole("button", { name: /unlock/i })).toBeDisabled();
    expect(onUnlock).not.toHaveBeenCalled();
  });

  it("unlocks with the correct PIN", async () => {
    vi.mocked(verifyPin).mockResolvedValue(true);
    const onUnlock = vi.fn();
    render(<Lock onUnlock={onUnlock} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("PIN"), "1234");
    await user.click(screen.getByRole("button", { name: /unlock/i }));

    expect(onUnlock).toHaveBeenCalledTimes(1);
    expect(verifyPin).toHaveBeenCalledWith("1234", "$argon2id$stored-hash");
  });
});
