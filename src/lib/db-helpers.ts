import { getSupabaseAdmin } from "./supabase-server";

/**
 * Typed database helpers — centralize casts until all routes use generated types directly.
 * Once database.ts is fully integrated, these can be replaced with direct calls.
 */

export async function dbInsert(table: string, values: any) {
  return getSupabaseAdmin().from(table as any).insert(values);
}

export async function dbInsertMany(table: string, values: any[]) {
  return getSupabaseAdmin().from(table as any).insert(values);
}

export async function dbUpdate(table: string, values: any) {
  return getSupabaseAdmin().from(table as any).update(values);
}

export async function dbUpsert(table: string, values: any) {
  return getSupabaseAdmin().from(table as any).upsert(values);
}
