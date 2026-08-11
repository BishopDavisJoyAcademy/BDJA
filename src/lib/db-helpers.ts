import { getSupabaseAdmin } from "./supabase-server";
import type { Database } from "@/types/database";

type TableName = keyof Database["public"]["Tables"];
type TableInsert<K extends TableName> = Database["public"]["Tables"][K]["Insert"];
type TableUpdate<K extends TableName> = Database["public"]["Tables"][K]["Update"];

export async function dbInsert<K extends TableName>(table: K, values: TableInsert<K>) {
  return getSupabaseAdmin().from(table as never).insert(values as never);
}

export async function dbInsertMany<K extends TableName>(table: K, values: TableInsert<K>[]) {
  return getSupabaseAdmin().from(table as never).insert(values as never);
}

export async function dbUpdate<K extends TableName>(table: K, id: string, values: TableUpdate<K>) {
  return getSupabaseAdmin().from(table as never).update(values as never).eq("id", id);
}

export async function dbUpsert<K extends TableName>(table: K, values: TableInsert<K>, conflictColumns: string[]) {
  return getSupabaseAdmin().from(table as never).upsert(values as never, { onConflict: conflictColumns.join(",") });
}

export async function dbDelete<K extends TableName>(table: K, id: string) {
  return getSupabaseAdmin().from(table as never).delete().eq("id", id);
}

export async function dbSelect<K extends TableName>(table: K, query: string = "*") {
  return getSupabaseAdmin().from(table as never).select(query);
}
