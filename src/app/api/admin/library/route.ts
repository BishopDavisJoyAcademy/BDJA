import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError, ValidationError } from "@/lib/errors";
import { Json } from "@/types/database";

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
    const categoryFilter = searchParams.get("category");
    const statusFilter = searchParams.get("status");
    const withBorrowings = searchParams.get("borrowings") === "true";
    const studentId = searchParams.get("student_id");

    if (id) {
      const { data: resource, error } = await admin
        .from("library_resources")
        .select("*, subjects(name)")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("[library GET] Single fetch error:", error.message);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
      if (!resource) {
        return NextResponse.json({ error: "Resource not found" }, { status: 404 });
      }

      let borrowings = null;
      let fines = null;

      if (withBorrowings) {
        const { data: borrowingsData } = await admin
          .from("library_borrowings")
          .select("*, profiles!library_borrowings_student_id_fkey(full_name)")
          .eq("resource_id", id)
          .order("borrowed_at", { ascending: false });
        borrowings = borrowingsData || [];

        // Get fines for these borrowings
        if (borrowings.length > 0) {
          const borrowingIds = borrowings.map((b) => b.id);
          const { data: finesData } = await admin
            .from("library_fines")
            .select("*")
            .in("borrowing_id", borrowingIds);
          fines = finesData || [];
        }
      }

      return NextResponse.json({ resource, borrowings, fines });
    }

    if (studentId) {
      // Get student's borrowing history
      const { data: borrowings } = await admin
        .from("library_borrowings")
        .select("*, library_resources(title, isbn, author)")
        .eq("student_id", studentId)
        .order("borrowed_at", { ascending: false });

      return NextResponse.json({ borrowings: borrowings || [] });
    }

    let query = admin
      .from("library_resources")
      .select("*, subjects(name)")
      .eq("resource_type", "book")
      .order("title", { ascending: true });

    if (categoryFilter && categoryFilter !== "all") {
      query = query.eq("category", categoryFilter);
    }

    const { data: resources, error } = await query;

    if (error) {
      console.error("[library GET] List fetch error:", error.message);
      return NextResponse.json({ error: "Failed to fetch library resources" }, { status: 500 });
    }

    let result = resources || [];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row) => {
        const title = String(row.title || "").toLowerCase();
        const author = String(row.author || "").toLowerCase();
        const isbn = String(row.isbn || "").toLowerCase();
        const barcode = String(row.barcode || "").toLowerCase();
        return title.includes(q) || author.includes(q) || isbn.includes(q) || barcode.includes(q);
      });
    }

    if (statusFilter && statusFilter !== "all") {
      result = result.filter((row) => {
        const available = (row.available_copies || 0) > 0;
        if (statusFilter === "available") return available;
        if (statusFilter === "unavailable") return !available;
        return true;
      });
    }

    return NextResponse.json({ resources: result });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[library GET] Unhandled error:", error);
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
    const action = body.action || "create_book";

    if (action === "borrow") {
      return handleBorrow(body, session, req);
    }
    if (action === "return") {
      return handleReturn(body, session, req);
    }
    if (action === "add_fine") {
      return handleAddFine(body, session, req);
    }
    if (action !== "create_book") {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return handleCreateBook(body, session, req);
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
    console.error("[library POST] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

async function handleCreateBook(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();

  const title = String(body.title || "").trim();
  const author = body.author ? String(body.author).trim() : null;
  const isbn = body.isbn ? String(body.isbn).trim() : null;
  const category = body.category ? String(body.category).trim() : null;
  const publisher = body.publisher ? String(body.publisher).trim() : null;
  const publicationYear = body.publication_year ? Number(body.publication_year) : null;
  const totalCopies = body.total_copies ? Number(body.total_copies) : 1;
  const location = body.location ? String(body.location).trim() : null;
  const barcode = body.barcode ? String(body.barcode).trim() : null;
  const subjectId = body.subject_id ? String(body.subject_id) : null;
  const campusId = body.campus_id ? String(body.campus_id) : null;
  const coverUrl = body.cover_url ? String(body.cover_url).trim() : null;

  if (!title) throw new ValidationError("Title is required");
  if (totalCopies < 1) throw new ValidationError("Total copies must be at least 1");

  // Check barcode uniqueness if provided
  if (barcode) {
    const { data: existing } = await admin
      .from("library_resources")
      .select("id")
      .eq("barcode", barcode)
      .maybeSingle();
    if (existing) throw new ValidationError("Barcode already exists");
  }

  const { data, error } = await admin.from("library_resources").insert({
    title,
    author,
    isbn,
    category,
    publisher,
    publication_year: publicationYear,
    total_copies: totalCopies,
    available_copies: totalCopies,
    location,
    barcode,
    subject_id: subjectId,
    campus_id: campusId,
    cover_url: coverUrl,
    resource_type: "book",
    created_by: session.userId,
  }).select().single();

  if (error) {
    console.error("[library POST] Create error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to create book" }, { status: 500 });
  }

  await logAudit({
    user_id: session.userId,
    action: "LIBRARY_BOOK_CREATED",
    table_name: "library_resources",
    record_id: data.id,
    new_data: body,
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true, book: data });
}

async function handleBorrow(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();

  const resourceId = String(body.resource_id || "");
  const studentId = String(body.student_id || "");
  const dueDate = String(body.due_date || "").trim();

  if (!resourceId) throw new ValidationError("Resource ID is required");
  if (!studentId) throw new ValidationError("Student ID is required");
  if (!dueDate) throw new ValidationError("Due date is required");

  // Check resource availability
  const { data: resource } = await admin
    .from("library_resources")
    .select("available_copies, total_copies")
    .eq("id", resourceId)
    .single();

  if (!resource) throw new ValidationError("Book not found");
  if ((resource.available_copies || 0) < 1) throw new ValidationError("No copies available");

  // Check if student already has this book borrowed
  const { data: existingBorrowing } = await admin
    .from("library_borrowings")
    .select("id")
    .eq("resource_id", resourceId)
    .eq("student_id", studentId)
    .is("returned_at", null)
    .maybeSingle();

  if (existingBorrowing) throw new ValidationError("Student already has this book borrowed");

  // Create borrowing record
  const { data: borrowing, error: borrowError } = await admin.from("library_borrowings").insert({
    resource_id: resourceId,
    student_id: studentId,
    due_date: dueDate,
    status: "borrowed",
    borrowed_at: new Date().toISOString(),
    staff_id: session.userId,
  }).select().single();

  if (borrowError) {
    console.error("[library POST] Borrow error:", borrowError.message);
    return NextResponse.json({ error: borrowError.message || "Failed to record borrowing" }, { status: 500 });
  }

  // Decrement available copies
  await admin.from("library_resources")
    .update({ available_copies: (resource.available_copies || 0) - 1 })
    .eq("id", resourceId);

  await logAudit({
    user_id: session.userId,
    action: "LIBRARY_BOOK_BORROWED",
    table_name: "library_borrowings",
    record_id: borrowing.id,
    new_data: body,
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true, borrowing });
}

async function handleReturn(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();

  const borrowingId = String(body.borrowing_id || "");

  if (!borrowingId) throw new ValidationError("Borrowing ID is required");

  const { data: borrowing } = await admin
    .from("library_borrowings")
    .select("*, library_resources(available_copies, total_copies)")
    .eq("id", borrowingId)
    .single();

  if (!borrowing) throw new ValidationError("Borrowing record not found");
  if (borrowing.returned_at) throw new ValidationError("Book already returned");

  const resourceId = borrowing.resource_id;
  const resource = borrowing.library_resources as { available_copies: number | null; total_copies: number | null } | null;

  // Mark as returned
  const { error } = await admin.from("library_borrowings")
    .update({
      returned_at: new Date().toISOString(),
      status: "returned",
    })
    .eq("id", borrowingId);

  if (error) {
    console.error("[library POST] Return error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to process return" }, { status: 500 });
  }

  // Increment available copies
  const currentAvailable = resource?.available_copies || 0;
  const totalCopies = resource?.total_copies || 1;
  await admin.from("library_resources")
    .update({ available_copies: Math.min(currentAvailable + 1, totalCopies) })
    .eq("id", resourceId);

  await logAudit({
    user_id: session.userId,
    action: "LIBRARY_BOOK_RETURNED",
    table_name: "library_borrowings",
    record_id: borrowingId,
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true });
}

async function handleAddFine(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();

  const borrowingId = String(body.borrowing_id || "");
  const amount = Number(body.amount || 0);
  const reason = String(body.reason || "").trim();

  if (!borrowingId) throw new ValidationError("Borrowing ID is required");
  if (amount <= 0) throw new ValidationError("Fine amount must be greater than zero");
  if (!reason) throw new ValidationError("Reason is required");

  // Verify borrowing exists
  const { data: borrowing } = await admin
    .from("library_borrowings")
    .select("id")
    .eq("id", borrowingId)
    .maybeSingle();

  if (!borrowing) throw new ValidationError("Borrowing record not found");

  const { data, error } = await admin.from("library_fines").insert({
    borrowing_id: borrowingId,
    amount,
    reason,
  }).select().single();

  if (error) {
    console.error("[library POST] Fine error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to add fine" }, { status: 500 });
  }

  await logAudit({
    user_id: session.userId,
    action: "LIBRARY_FINE_ADDED",
    table_name: "library_fines",
    record_id: data.id,
    new_data: body,
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true, fine: data });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "Book ID required" }, { status: 400 });

    const admin = getSupabaseAdmin();

    const { data: existing } = await admin.from("library_resources").select("*").eq("id", id).single();
    if (!existing) return NextResponse.json({ error: "Book not found" }, { status: 404 });

    const updateData: {
      title?: string;
      author?: string | null;
      isbn?: string | null;
      category?: string | null;
      publisher?: string | null;
      publication_year?: number | null;
      total_copies?: number;
      available_copies?: number;
      location?: string | null;
      barcode?: string | null;
      subject_id?: string | null;
      campus_id?: string | null;
      cover_url?: string | null;
    } = {};

    if (updates.title !== undefined) updateData.title = String(updates.title).trim();
    if (updates.author !== undefined) updateData.author = updates.author || null;
    if (updates.isbn !== undefined) updateData.isbn = updates.isbn || null;
    if (updates.category !== undefined) updateData.category = updates.category || null;
    if (updates.publisher !== undefined) updateData.publisher = updates.publisher || null;
    if (updates.publication_year !== undefined) updateData.publication_year = updates.publication_year ? Number(updates.publication_year) : null;
    if (updates.total_copies !== undefined) updateData.total_copies = Number(updates.total_copies);
    if (updates.available_copies !== undefined) updateData.available_copies = Number(updates.available_copies);
    if (updates.location !== undefined) updateData.location = updates.location || null;
    if (updates.barcode !== undefined) updateData.barcode = updates.barcode || null;
    if (updates.subject_id !== undefined) updateData.subject_id = updates.subject_id || null;
    if (updates.campus_id !== undefined) updateData.campus_id = updates.campus_id || null;
    if (updates.cover_url !== undefined) updateData.cover_url = updates.cover_url || null;

    const { error } = await admin.from("library_resources").update(updateData).eq("id", id);

    if (error) {
      console.error("[library PATCH] Update error:", error.message);
      return NextResponse.json({ error: "Failed to update book" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "LIBRARY_BOOK_UPDATED",
      table_name: "library_resources",
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
    console.error("[library PATCH] Unhandled error:", error);
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

    if (!id) return NextResponse.json({ error: "Book ID required" }, { status: 400 });

    const admin = getSupabaseAdmin();

    // Check if book has active borrowings
    const { data: activeBorrowings } = await admin
      .from("library_borrowings")
      .select("id")
      .eq("resource_id", id)
      .is("returned_at", null)
      .limit(1);

    if (activeBorrowings && activeBorrowings.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete book with active borrowings. Return all copies first." },
        { status: 400 }
      );
    }

    const { error } = await admin.from("library_resources").delete().eq("id", id);

    if (error) {
      console.error("[library DELETE] Delete error:", error.message);
      return NextResponse.json({ error: "Failed to delete book" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "LIBRARY_BOOK_DELETED",
      table_name: "library_resources",
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
    console.error("[library DELETE] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
