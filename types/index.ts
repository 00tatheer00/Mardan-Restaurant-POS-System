import type { Tables } from "./database";

export type * from "./database";

export type Profile = Pick<Tables<"profiles">, "id" | "full_name" | "username" | "role" | "is_active">;
