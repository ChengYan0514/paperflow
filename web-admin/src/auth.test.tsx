import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { App, createTestRouter } from "./main";

type FetchCall = { input: RequestInfo | URL; init?: RequestInit };

const taskStatus = {
  totals: {
    sourceCount: 0,
    workCount: 0,
    originalFileCount: 0,
    matchedWorkCount: 0,
    parsedFileCount: 0,
    blockImportedFileCount: 0,
  },
  sources: [],
};

beforeEach(() => {
  document.cookie = "XSRF-TOKEN=; Max-Age=0; path=/";
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mockFetch(handler: (call: FetchCall) => Response | Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => handler({ input, init }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderPath(path: string) {
  const router = createTestRouter([path]);
  render(<App router={router} />);
  return router;
}

const adminUser = { id: 1, username: "admin", displayName: "Root Admin", role: "ADMIN" };
const viewerUser = { id: 2, username: "viewer", displayName: null, role: "VIEWER" };

const adminUsers = [
  {
    id: 1,
    username: "admin",
    displayName: "Root Admin",
    role: "ADMIN",
    enabled: true,
    lastLoginAt: "2026-07-08T10:20:30Z",
    createdAt: "2026-07-01T08:00:00Z",
    updatedAt: "2026-07-08T10:20:30Z",
  },
  {
    id: 2,
    username: "viewer",
    displayName: null,
    role: "VIEWER",
    enabled: false,
    lastLoginAt: null,
    createdAt: "2026-07-02T09:00:00Z",
    updatedAt: "2026-07-03T09:00:00Z",
  },
];

describe("auth flow", () => {
  test("renders login page at /login", async () => {
    mockFetch(() => json({ code: "UNAUTHORIZED", message: "Unauthorized", requestId: "r1" }, 401));

    renderPath("/login");

    expect(await screen.findByRole("heading", { name: "登录 Paperflow" })).toBeInTheDocument();
    expect(screen.getByLabelText("用户名")).toBeInTheDocument();
  });

  test("redirects unauthenticated admin routes to login with the original target", async () => {
    const fetchMock = mockFetch(({ input }) => {
      if (String(input).endsWith("/api/auth/me")) {
        return json({ code: "UNAUTHORIZED", message: "Unauthorized", requestId: "r1" }, 401);
      }
      return json({ token: "csrf-1", headerName: "X-XSRF-TOKEN", parameterName: "_csrf" });
    });
    const router = renderPath("/task-status");

    expect(await screen.findByRole("heading", { name: "登录 Paperflow" })).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(router.state.location.search).toContain("redirect=%2Ftask-status");
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/me", expect.objectContaining({ credentials: "same-origin" }));
  });

  test("logs in with csrf header and returns to the original target", async () => {
    document.cookie = "XSRF-TOKEN=csrf-cookie; path=/";
    const loginCalls: FetchCall[] = [];
    const fetchMock = mockFetch(({ input, init }) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) {
        return json({ code: "UNAUTHORIZED", message: "Unauthorized", requestId: "r1" }, 401);
      }
      if (url.endsWith("/api/auth/csrf")) {
        return json({ token: "csrf-response", headerName: "X-XSRF-TOKEN", parameterName: "_csrf" });
      }
      if (url.endsWith("/api/auth/login")) {
        loginCalls.push({ input, init });
        return json({ id: 1, username: "Admin", displayName: "Root Admin", role: "ADMIN" });
      }
      if (url.endsWith("/api/task-status")) {
        return json(taskStatus);
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
    const router = renderPath("/login?redirect=%2Ftask-status");

    await screen.findByRole("heading", { name: "登录 Paperflow" });
    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "correct-password-1" } });
    fireEvent.submit(screen.getByRole("button", { name: "登录" }).closest("form")!);

    await waitFor(() => expect(router.state.location.pathname).toBe("/task-status"));
    expect(await screen.findByText("Root Admin")).toBeInTheDocument();
    expect((loginCalls[0].init?.headers as Headers).get("X-XSRF-TOKEN")).toBe("csrf-cookie");
    expect(loginCalls[0].init?.body).toBe(JSON.stringify({ username: "admin", password: "correct-password-1" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ credentials: "same-origin" }));
  });

  test("keeps failed login on /login and shows the api error", async () => {
    mockFetch(({ input }) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) {
        return json({ code: "UNAUTHORIZED", message: "Unauthorized", requestId: "r1" }, 401);
      }
      if (url.endsWith("/api/auth/csrf")) {
        return json({ token: "csrf-1", headerName: "X-XSRF-TOKEN", parameterName: "_csrf" });
      }
      if (url.endsWith("/api/auth/login")) {
        return json({ code: "UNAUTHORIZED", message: "Username or password is incorrect", requestId: "r2" }, 401);
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
    const router = renderPath("/login");

    await screen.findByRole("heading", { name: "登录 Paperflow" });
    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "wrong-password" } });
    fireEvent.submit(screen.getByRole("button", { name: "登录" }).closest("form")!);

    expect(await screen.findByText("Username or password is incorrect")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.search).toBe("");
  });

  test("redirects authenticated /login visits to the dashboard", async () => {
    mockFetch(({ input }) => {
      if (String(input).endsWith("/api/auth/me")) {
        return json({ id: 2, username: "viewer", displayName: null, role: "VIEWER" });
      }
      throw new Error(`Unexpected fetch ${String(input)}`);
    });
    const router = renderPath("/login");

    await waitFor(() => expect(router.state.location.pathname).toBe("/task-status"));
  });

  test("logs out with csrf header and returns to /login", async () => {
    document.cookie = "XSRF-TOKEN=csrf-cookie; path=/";
    const logoutCalls: FetchCall[] = [];
    mockFetch(({ input, init }) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) {
        return json({ id: 1, username: "Admin", displayName: "Root Admin", role: "ADMIN" });
      }
      if (url.endsWith("/api/task-status")) {
        return json(taskStatus);
      }
      if (url.endsWith("/api/auth/logout")) {
        logoutCalls.push({ input, init });
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
    const router = renderPath("/task-status");

    expect(await screen.findByText("Root Admin")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "退出" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect((logoutCalls[0].init?.headers as Headers).get("X-XSRF-TOKEN")).toBe("csrf-cookie");
  });
});

describe("admin users page", () => {
  test("shows user management navigation only to admins", async () => {
    mockFetch(({ input }) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) return json(adminUser);
      if (url.endsWith("/api/task-status")) return json(taskStatus);
      throw new Error(`Unexpected fetch ${url}`);
    });
    renderPath("/task-status");

    expect(await screen.findByText("用户管理")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "用户列表" })).toBeInTheDocument();

    cleanup();
    mockFetch(({ input }) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) return json(viewerUser);
      if (url.endsWith("/api/task-status")) return json(taskStatus);
      throw new Error(`Unexpected fetch ${url}`);
    });
    renderPath("/task-status");

    await screen.findByText("viewer");
    expect(screen.queryByText("用户管理")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "用户列表" })).not.toBeInTheDocument();
  });

  test("guards /users by role and removes the roles placeholder", async () => {
    mockFetch(({ input }) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) return json(viewerUser);
      throw new Error(`Unexpected fetch ${url}`);
    });
    renderPath("/users");

    expect(await screen.findByRole("heading", { name: "403" })).toBeInTheDocument();
    expect(screen.getByText("当前账号无权访问此页面")).toBeInTheDocument();

    cleanup();
    const fetchMock = mockFetch(({ input }) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) return json(adminUser);
      if (url.endsWith("/api/admin-users")) return json(adminUsers);
      throw new Error(`Unexpected fetch ${url}`);
    });
    renderPath("/users");

    expect(await screen.findByRole("heading", { name: "用户列表" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/admin-users", expect.objectContaining({ credentials: "same-origin" }));

    cleanup();
    mockFetch(({ input }) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) return json(adminUser);
      if (url.endsWith("/api/admin-users")) return json([]);
      throw new Error(`Unexpected fetch ${url}`);
    });
    const router = renderPath("/roles");

    await waitFor(() => expect(router.state.location.pathname).toBe("/users"));
    expect(screen.queryByText("角色权限")).not.toBeInTheDocument();
  });

  test("renders admin users without ids or password hashes", async () => {
    mockFetch(({ input }) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) return json(adminUser);
      if (url.endsWith("/api/admin-users")) return json(adminUsers);
      throw new Error(`Unexpected fetch ${url}`);
    });
    renderPath("/users");

    expect(await screen.findByText("admin")).toBeInTheDocument();
    expect(screen.getAllByText("Root Admin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ADMIN")[0]).toBeInTheDocument();
    expect(screen.getAllByText("VIEWER")[0]).toBeInTheDocument();
    expect(screen.getAllByText("启用")[0]).toBeInTheDocument();
    expect(screen.getAllByText("禁用")[0]).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    expect(screen.getByText("2026-07-08 10:20")).toBeInTheDocument();
    expect(screen.getByText("2026-07-01 08:00")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "重置密码" })[0]).toBeInTheDocument();
    expect(screen.queryByText("passwordHash")).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "ID" })).not.toBeInTheDocument();
  });

  test("creates an admin user with csrf and refreshes the list", async () => {
    document.cookie = "XSRF-TOKEN=csrf-cookie; path=/";
    const createCalls: FetchCall[] = [];
    let listCalls = 0;
    mockFetch(({ input, init }) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) return json(adminUser);
      if (url.endsWith("/api/admin-users") && init?.method === "POST") {
        createCalls.push({ input, init });
        return json({ ...adminUsers[1], id: 3, username: "new.viewer", displayName: null, enabled: true }, 201);
      }
      if (url.endsWith("/api/admin-users")) {
        listCalls += 1;
        return json(listCalls === 1 ? adminUsers : [...adminUsers, { ...adminUsers[1], id: 3, username: "new.viewer", displayName: null, enabled: true }]);
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
    renderPath("/users");

    await screen.findByRole("heading", { name: "用户列表" });
    fireEvent.click(screen.getByRole("button", { name: "创建用户" }));
    expect(screen.queryByLabelText("确认密码")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "new.viewer" } });
    fireEvent.change(screen.getByLabelText("显示名"), { target: { value: " " } });
    fireEvent.change(screen.getByLabelText("角色"), { target: { value: "VIEWER" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "viewer-password-1" } });
    fireEvent.click(screen.getByLabelText("启用账号"));
    fireEvent.click(screen.getByLabelText("启用账号"));
    fireEvent.click(screen.getByRole("button", { name: "保存用户" }));

    await screen.findByText("new.viewer");
    expect((createCalls[0].init?.headers as Headers).get("X-XSRF-TOKEN")).toBe("csrf-cookie");
    expect(createCalls[0].init?.body).toBe(
      JSON.stringify({ username: "new.viewer", displayName: "", role: "VIEWER", password: "viewer-password-1", enabled: true }),
    );
  });

  test("updates enabled state and role, and shows conflict messages", async () => {
    document.cookie = "XSRF-TOKEN=csrf-cookie; path=/";
    const patchCalls: FetchCall[] = [];
    mockFetch(({ input, init }) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) return json(adminUser);
      if (url.endsWith("/api/admin-users")) return json(adminUsers);
      if (url.endsWith("/api/admin-users/2")) {
        patchCalls.push({ input, init });
        return json({ code: "ADMIN_USER_CONFLICT", message: "Admin User conflict", requestId: "r9" }, 409);
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
    renderPath("/users");

    await screen.findByText("viewer");
    fireEvent.click(screen.getAllByRole("button", { name: "启用" })[0]);

    expect(await screen.findByText("Admin User conflict")).toBeInTheDocument();
    expect((patchCalls[0].init?.headers as Headers).get("X-XSRF-TOKEN")).toBe("csrf-cookie");
    expect(patchCalls[0].init?.body).toBe(JSON.stringify({ enabled: true }));

    fireEvent.change(screen.getByLabelText("viewer 的角色"), { target: { value: "ADMIN" } });
    expect(patchCalls[1].init?.body).toBe(JSON.stringify({ role: "ADMIN" }));
  });

  test("resets another user's password with csrf", async () => {
    document.cookie = "XSRF-TOKEN=csrf-cookie; path=/";
    const resetCalls: FetchCall[] = [];
    mockFetch(({ input, init }) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) return json(adminUser);
      if (url.endsWith("/api/admin-users")) return json(adminUsers);
      if (url.endsWith("/api/admin-users/2/reset-password")) {
        resetCalls.push({ input, init });
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
    renderPath("/users");

    await screen.findByText("viewer");
    fireEvent.click(screen.getAllByRole("button", { name: "重置密码" })[1]);
    expect(screen.queryByLabelText("确认密码")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("新密码"), { target: { value: "reset-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: "保存新密码" }));

    expect(await screen.findByText("密码已重置")).toBeInTheDocument();
    expect((resetCalls[0].init?.headers as Headers).get("X-XSRF-TOKEN")).toBe("csrf-cookie");
    expect(resetCalls[0].init?.body).toBe(JSON.stringify({ newPassword: "reset-password-123" }));
  });

  test("changes own password only when confirmation matches", async () => {
    document.cookie = "XSRF-TOKEN=csrf-cookie; path=/";
    const changeCalls: FetchCall[] = [];
    mockFetch(({ input, init }) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) return json(adminUser);
      if (url.endsWith("/api/task-status")) return json(taskStatus);
      if (url.endsWith("/api/auth/change-password")) {
        changeCalls.push({ input, init });
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
    renderPath("/task-status");

    await screen.findByText("Root Admin");
    fireEvent.click(screen.getByRole("button", { name: "修改密码" }));
    fireEvent.change(screen.getByLabelText("当前密码"), { target: { value: "old-password-1" } });
    fireEvent.change(screen.getByLabelText("新密码"), { target: { value: "new-password-123" } });
    fireEvent.change(screen.getByLabelText("确认新密码"), { target: { value: "different-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: "保存密码" }));

    expect(await screen.findByText("两次输入的新密码不一致")).toBeInTheDocument();
    expect(changeCalls).toHaveLength(0);

    fireEvent.change(screen.getByLabelText("确认新密码"), { target: { value: "new-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: "保存密码" }));

    expect(await screen.findByText("密码已修改")).toBeInTheDocument();
    expect(changeCalls[0].init?.body).toBe(JSON.stringify({ oldPassword: "old-password-1", newPassword: "new-password-123" }));
  });
});
