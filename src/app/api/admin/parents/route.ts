import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError, ValidationError } from "@/lib/errors";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const searchQuery = searchParams.get("q");
    const withChildren = searchParams.get("children") === "true";
    const withActivity = searchParams.get("activity") === "true";

    if (id) {
      const { data: parent, error } = await admin
        .from("profiles")
        .select("*")
        .eq("id", id)
        .eq("user_category", "parent")
        .maybeSingle();

      if (error) {
        console.error("[parents GET] Single fetch error:", error.message);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
      if (!parent) {
        return NextResponse.json({ error: "Parent not found" }, { status: 404 });
      }

      let children = null;
      let activity = null;

      if (withChildren) {
        const { data: childrenData } = await admin
          .from("parent_students")
          .select("*, students(*, profiles!students_profile_id_fkey(full_name, email, avatar_url))")
          .eq("parent_id", id);
        children = childrenData || [];
      }

      if (withActivity) {
        const { data: activityData } = await admin
          .from("audit_logs")
          .select("*")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(50);
        activity = activityData || [];
      }

      return NextResponse.json({ parent, children, activity });
    }

    let query = admin
      .from("profiles")
      .select("*")
      .eq("user_category", "parent")
      .order("created_at", { ascending: false });

    const { data: parents, error } = await query;

    if (error) {
      console.error("[parents GET] List fetch error:", error.message);
      return NextResponse.json({ error: "Failed to fetch parents" }, { status: 500 });
    }

    let result = parents || [];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row) => {
        const fullName = String(row.full_name || "").toLowerCase();
        const email = String(row.email || "").toLowerCase();
        const phone = String(row.phone || "").toLowerCase();
        return fullName.includes(q) || email.includes(q) || phone.includes(q);
      });
    }

    // Get children counts
    const parentIds: string[] = result.map((p) => p.id);
    let childrenCounts: Record<string, number> = {};
    if (parentIds.length > 0) {
      const { data: linksData } = await admin
        .from("parent_students")
        .select("parent_id")
        .in("parent_id", parentIds);

      if (linksData) {
        for (const link of linksData) {
          if (link.parent_id) {
            childrenCounts[link.parent_id] = (childrenCounts[link.parent_id] || 0) + 1;
          }
        }
      }
    }

    return NextResponse.json({ parents: result, childrenCounts });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[parents GET] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action || "create";

    if (action === "link_student") {
      return handleLinkStudent(body, session, req);
    }

    if (action === "unlink_student") {
      return handleUnlinkStudent(body, session, req);
    }

    if (action === "bulk_message") {
      return handleBulkMessage(body, session, req);
    }

    if (action !== "create") {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return handleCreateParent(body, session, req);
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 400 });
    }
    console.error("[parents POST] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

async function handleCreateParent(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();

  const fullName = String(body.full_name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = body.phone ? String(body.phone).trim() : null;

  if (!fullName) throw new ValidationError("Full name is required");
  if (!email) throw new ValidationError("Email is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("Invalid email format");

  // Check email uniqueness
  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) throw new ValidationError("Email already in use");

  // Create auth user first
  const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName, user_category: "parent" },
  });

  if (authError || !authUser.user) {
    console.error("[parents POST] Auth create error:", authError?.message);
    throw new ValidationError(authError?.message || "Failed to create auth user");
  }

  const userId = authUser.user.id;

  // Insert profile
  const { data, error } = await admin.from("profiles").insert({
    id: userId,
    email,
    full_name: fullName,
    phone,
    user_category: "parent",
    role: "parent",
    is_active: true,
    password_changed: false,
    onboarding_completed: false,
  }).select().single();

  if (error) {
    // Rollback: delete auth user
    await admin.auth.admin.deleteUser(userId);
    console.error("[parents POST] Profile insert error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to create parent" }, { status: 500 });
  }

  await logAudit({
    user_id: session.userId,
    action: "PARENT_CREATED",
    table_name: "profiles",
    record_id: userId,
    new_data: body,
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true, parent: data });
}

async function handleLinkStudent(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();
  const parentId = String(body.parent_id || "");
  const studentId = String(body.student_id || "");
  const relationship = body.relationship ? String(body.relationship) : "guardian";
  const isPrimary = Boolean(body.is_primary);

  if (!parentId) throw new ValidationError("Parent ID is required");
  if (!studentId) throw new ValidationError("Student ID is required");

  // Verify parent exists
  const { data: parent } = await admin
    .from("profiles")
    .select("id")
    .eq("id", parentId)
    .eq("user_category", "parent")
    .maybeSingle();
  if (!parent) throw new ValidationError("Parent not found");

  // Verify student exists
  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) throw new ValidationError("Student not found");

  // Check if link already exists
  const { data: existingLink } = await admin
    .from("parent_students")
    .select("id")
    .eq("parent_id", parentId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existingLink) throw new ValidationError("This parent is already linked to this student");

  const { data, error } = await admin.from("parent_students").insert({
    parent_id: parentId,
    student_id: studentId,
    relationship,
    is_primary: isPrimary,
  }).select().single();

  if (error) {
    console.error("[parents POST] Link error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to link student" }, { status: 500 });
  }

  await logAudit({
    user_id: session.userId,
    action: "PARENT_STUDENT_LINKED",
    table_name: "parent_students",
    record_id: data.id,
    new_data: { parent_id: parentId, student_id: studentId, relationship },
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true, link: data });
}

async function handleUnlinkStudent(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();
  const linkId = String(body.link_id || "");

  if (!linkId) throw new ValidationError("Link ID is required");

  const { error } = await admin.from("parent_students").delete().eq("id", linkId);

  if (error) {
    console.error("[parents POST] Unlink error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to unlink student" }, { status: 500 });
  }

  await logAudit({
    user_id: session.userId,
    action: "PARENT_STUDENT_UNLINKED",
    table_name: "parent_students",
    record_id: linkId,
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true });
}

async function handleBulkMessage(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();
  const parentIds = body.parent_ids as string[] || [];
  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();

  if (parentIds.length === 0) throw new ValidationError("No parents selected");
  if (!subject) throw new ValidationError("Subject is required");
  if (!message) throw new ValidationError("Message is required");

  // Create messages for each parent
  const messages = parentIds.map((parentId) => ({
    sender_id: session.userId,
    receiver_id: parentId,
    subject,
    content: message,
    class_id: null,
  }));

  const { error } = await admin.from("messages").insert(messages);

  if (error) {
    console.error("[parents POST] Bulk message error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to send messages" }, { status: 500 });
  }

  await logAudit({
    user_id: session.userId,
    action: "PARENT_BULK_MESSAGE_SENT",
    table_name: "messages",
    new_data: { recipient_count: parentIds.length, subject },
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true, sent_count: parentIds.length });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "Parent ID required" }, { status: 400 });

    const admin = getSupabaseAdmin();

    const { data: existing } = await admin
      .from("profiles")
      .select("*")
      .eq("id", id)
      .eq("user_category", "parent")
      .single();

    if (!existing) return NextResponse.json({ error: "Parent not found" }, { status: 404 });

    const updateData: {
      full_name?: string;
      phone?: string | null;
      is_active?: boolean;
    } = {};
    if (updates.full_name !== undefined) updateData.full_name = String(updates.full_name).trim();
    if (updates.phone !== undefined) updateData.phone = updates.phone || null;
    if (updates.is_active !== undefined) updateData.is_active = Boolean(updates.is_active);

    const { error } = await admin.from("profiles").update(updateData).eq("id", id);

    if (error) {
      console.error("[parents PATCH] Update error:", error.message);
      return NextResponse.json({ error: "Failed to update parent" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "PARENT_UPDATED",
      table_name: "profiles",
      record_id: id,
      old_data: existing,
      new_data: updateData,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[parents PATCH] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Parent ID required" }, { status: 400 });

    const admin = getSupabaseAdmin();

    // Check if parent has linked students
    const { data: linksData } = await admin
      .from("parent_students")
      .select("id")
      .eq("parent_id", id)
      .limit(1);

    if (linksData && linksData.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete parent with linked students. Unlink students first." },
        { status: 400 }
      );
    }

    // Delete auth user (cascades to profile via FK)
    const { error: authError } = await admin.auth.admin.deleteUser(id);
    if (authError) {
      console.error("[parents DELETE] Auth delete error:", authError.message);
    }

    const { error } = await admin.from("profiles").delete().eq("id", id).eq("user_category", "parent");

    if (error) {
      console.error("[parents DELETE] Delete error:", error.message);
      return NextResponse.json({ error: "Failed to delete parent" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "PARENT_DELETED",
      table_name: "profiles",
      record_id: id,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[parents DELETE] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
