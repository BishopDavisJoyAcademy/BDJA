import { getSupabaseAdmin } from "./supabase-server";
import { getErrorMessage } from "./errors";

export async function restoreMissingProfile(userId: string, email: string): Promise<boolean> {
  try {
    const admin = getSupabaseAdmin();
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existing) return true;

    const { error } = await admin.from("profiles").insert([{
      id: userId,
      email,
      full_name: email.split("@")[0],
      role: "student",
      is_active: true,
      must_change_password: false,
    }]);

    if (error) {
      console.error("[restoreMissingProfile] Insert error:", error);
      return false;
    }
    return true;
  } catch (err: unknown) {
    console.error("[restoreMissingProfile] Exception:", getErrorMessage(err));
    return false;
  }
}
