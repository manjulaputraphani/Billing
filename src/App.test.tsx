import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { getSecret, verifyPassword } from "./lib/secrets";
import { countUsers, createUser, findUserByPhone } from "./db/users";

vi.mock("./lib/secrets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./lib/secrets")>();
  return {
    ...actual,
    getSecret: vi.fn(),
    saveSecret: vi.fn(),
    deleteSecret: vi.fn(),
    hashPin: vi.fn(),
    verifyPin: vi.fn(),
    hashPassword: vi.fn(),
    verifyPassword: vi.fn(),
  };
});
vi.mock("./db/client", () => ({ getDb: vi.fn(() => ({})), pingDb: vi.fn() }));
vi.mock("./db/users", () => ({
  countUsers: vi.fn(),
  findUserByPhone: vi.fn(),
  createUser: vi.fn(),
}));
vi.mock("./db/activity", () => ({
  logActivity: vi.fn(async () => {}),
  setAuditActor: vi.fn(),
  getAuditActor: vi.fn(() => ({ userId: 1, name: "Phani", role: "owner" })),
  listActivity: vi.fn(async () => []),
}));
vi.mock("./db/permissions", async () => {
  const { DEFAULT_ROLE_PERMISSIONS } = await import("./logic/permissions");
  return {
    loadPermissionsForRole: vi.fn(async () => DEFAULT_ROLE_PERMISSIONS.owner),
    setCurrentPermissions: vi.fn(),
    can: vi.fn(() => true),
  };
});

const SAVED_URL = "postgresql://user:secret@ep-host-1.neon.tech/db";
const USER = {
  id: 1,
  name: "Phani",
  phone: "9876543210",
  role: "owner" as const,
  active: true,
  pending: false,
  accessUntil: null,
  passwordHash: "hash",
};

beforeEach(() => {
  vi.mocked(getSecret)
    .mockReset()
    .mockImplementation(async (key) => (key === "DATABASE_URL" ? SAVED_URL : null));
  vi.mocked(countUsers).mockReset().mockResolvedValue(1);
  vi.mocked(findUserByPhone).mockReset().mockResolvedValue(USER);
  vi.mocked(createUser).mockReset().mockResolvedValue(USER);
  vi.mocked(verifyPassword).mockReset().mockResolvedValue(true);
});

describe("App start flow", () => {
  it("shows Setup on first launch when no connection is saved", async () => {
    vi.mocked(getSecret).mockResolvedValue(null);
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: /set up stock tracker/i }),
    ).toBeInTheDocument();
  });

  it("asks for phone + password (not the URL or a PIN) when connected", async () => {
    render(<App />);

    expect(await screen.findByLabelText("Phone number")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByLabelText("Neon connection string")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^pin$/i)).not.toBeInTheDocument();
  });

  it("goes Home after a correct phone + password", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Phone number"), "9876543210");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("shows the owner setup on the very first run", async () => {
    vi.mocked(countUsers).mockResolvedValue(0);
    render(<App />);

    expect(await screen.findByTestId("owner-form")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create owner" })).toBeInTheDocument();
  });
});
