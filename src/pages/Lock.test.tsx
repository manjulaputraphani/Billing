import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Lock from "./Lock";
import { countUsers, createUser, findUserByPhone } from "../db/users";
import { setAuditActor } from "../db/activity";
import { verifyPassword } from "../lib/secrets";

vi.mock("../db/client", () => ({ getDb: vi.fn(() => ({})) }));
vi.mock("../db/users", () => ({ countUsers: vi.fn(), findUserByPhone: vi.fn(), createUser: vi.fn() }));
vi.mock("../db/activity", () => ({
  logActivity: vi.fn(async () => {}),
  setAuditActor: vi.fn(),
}));
vi.mock("../lib/secrets", () => ({
  verifyPassword: vi.fn(),
  deleteSecret: vi.fn(async () => {}),
  SECRET_KEYS: { PIN_HASH: "PIN_HASH" },
}));

const USER = {
  id: 1,
  name: "Ravi",
  phone: "9876543210",
  role: "owner" as const,
  active: true,
  passwordHash: "hash",
};

function renderPage() {
  const onLogin = vi.fn();
  render(<Lock url="postgresql://user:pass@host/db" onLogin={onLogin} />);
  return onLogin;
}

beforeEach(() => {
  vi.mocked(countUsers).mockReset().mockResolvedValue(1);
  vi.mocked(findUserByPhone).mockReset().mockResolvedValue(USER);
  vi.mocked(createUser).mockReset().mockResolvedValue(USER);
  vi.mocked(verifyPassword).mockReset().mockResolvedValue(true);
  vi.mocked(setAuditActor).mockReset();
});

describe("member login", () => {
  it("signs in with phone + password and records the actor", async () => {
    const onLogin = renderPage();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Phone number"), "9876543210");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(verifyPassword).toHaveBeenCalledWith("secret123", "hash");
    expect(setAuditActor).toHaveBeenCalledWith({ userId: 1, name: "Ravi", role: "owner" });
    expect(onLogin).toHaveBeenCalledWith(USER);
  });

  it("shows the owner setup on the first run", async () => {
    vi.mocked(countUsers).mockResolvedValue(0);
    const onLogin = renderPage();
    const user = userEvent.setup();

    expect(await screen.findByTestId("owner-form")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Your name"), "Phani");
    await user.type(screen.getByLabelText("Phone number"), "9876543210");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.type(screen.getByLabelText("Confirm password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Create owner" }));

    expect(createUser).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: "Phani", phone: "9876543210", role: "owner" }),
    );
    expect(onLogin).toHaveBeenCalledWith(USER);
  });

  it("rejects a wrong password", async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false);
    const onLogin = renderPage();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Phone number"), "9876543210");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong password");
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("rejects an unknown or disabled account", async () => {
    vi.mocked(findUserByPhone).mockResolvedValueOnce(null);
    renderPage();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Phone number"), "9876543210");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No account found");
  });
});
