import { createClient } from "./client";

export * from "./client";
export { default } from "./client";

export const supabase = typeof window !== "undefined"
  ? createClient()
  : (null as unknown as ReturnType<typeof createClient>);
