import { getSupabaseAdmin } from "./supabase-server";
import type { Database } from "@/types/database";

type TableName = keyof Database["public"]["Tables"];

/**
 * Returns a fully-typed Supabase query builder for the specified table.
 *
 * Because the table name is passed as a literal string at the call site,
 * TypeScript infers the exact table type, and all chained methods
 * (.insert(), .update(), .eq(), .select(), etc.) are fully type-checked.
 *
 * @example
 *   await db("students").insert({ name: "John", grade: "Grade 1" });
 *   await db("students").update({ name: "Jane" }).eq("id", "uuid-here");
 *   await db("students").delete().eq("id", "uuid-here");
 *   const { data } = await db("students").select("*").eq("grade", "Grade 1");
 */
export function db<T extends TableName>(table: T) {
  return getSupabaseAdmin().from(table);
}
