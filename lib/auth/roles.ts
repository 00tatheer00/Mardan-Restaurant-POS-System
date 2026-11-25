export type Role = "owner" | "manager" | "cashier";

const ACCESS: Record<Role, string[]> = {
  owner: ["*"],
  manager: ["/pos", "/dashboard", "/orders", "/stock", "/production", "/expenses", "/reports"],
  cashier: ["/pos"],
};

export const canAccess = (role: Role, path: string) =>
  ACCESS[role].some((p) => p === "*" || path === p || path.startsWith(p + "/"));

export const homeFor = (role: Role) => (role === "cashier" ? "/pos" : "/dashboard");

export const ROLE_LABEL: Record<Role, string> = { owner: "Owner", manager: "Manager", cashier: "Cashier" };
