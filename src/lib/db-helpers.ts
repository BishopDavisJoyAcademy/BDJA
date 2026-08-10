import { getSupabaseAdmin } from "./supabase-server";

export async function dbInsert<T extends Record<string, any>>(table: string, values: T) {
  return getSupabaseAdmin().from(table as keyof Database['public']['Tables']).insert(values);
}

export async function dbInsertMany<T extends Record<string, any>>(table: string, values: T[]) {
  return getSupabaseAdmin().from(table as keyof Database['public']['Tables']).insert(values);
}

export async function dbUpdate<T extends Record<string, any>>(table: string, id: string, values: Partial<T>) {
  return getSupabaseAdmin().from(table as any).update(values).eq("id", id);
}

export async function dbUpsert<T extends Record<string, any>>(table: string, values: T, conflictColumns: string[]) {
  return getSupabaseAdmin().from(table as any).upsert(values, { onConflict: conflictColumns.join(",") });
}

export async function dbDelete(table: string, id: string) {
  return getSupabaseAdmin().from(table as any).delete().eq("id", id);
}

export async function dbSelect(table: string, query: string = "*") {
  return getSupabaseAdmin().from(table as any).select(query);
}
