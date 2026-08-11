import { getSupabaseAdmin } from "./supabase-server";
import type { Database } from "@/types/database";

type TableName = keyof Database["public"]["Tables"];

export async function dbInsert<K extends TableName, T extends Record<string, unknown>>(table: K, values: T) {
  return getSupabaseAdmin().from(table).insert(values);
}

export async function dbInsertMany<K extends TableName, T extends Record<string, unknown>>(table: K, values: T[]) {
  return getSupabaseAdmin().from(table).insert(values);
}

export async function dbUpdate<K extends TableName, T extends Record<string, unknown>>(table: K, id: string, values: Partial<T>) {
  return getSupabaseAdmin().from(table).update(values).eq("id", id);
}

export async function dbUpsert<K extends TableName, T extends Record<string, unknown>>(table: K, values: T, conflictColumns: string[]) {
  return getSupabaseAdmin().from(table).upsert(values, { onConflict: conflictColumns.join(",") });
}

export async function dbDelete<K extends TableName>(table: K, id: string) {
  return getSupabaseAdmin().from(table).delete().eq("id", id);
}

export async function dbSelect<K extends TableName>(table: K, query: string = "*") {
  return getSupabaseAdmin().from(table).select(query);
}
