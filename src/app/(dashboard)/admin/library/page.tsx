"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHead, TableBody, TableCell, TableHeader } from "@/components/ui/Table";
import {
  Loader2, Plus, Pencil, Trash2, X, CheckCircle, Search, BookOpen,
  Barcode, User, Calendar, AlertTriangle, Eye, BookX, BookCheck,
  DollarSign, QrCode, Library, Bookmark, Hash, MapPin, Building2
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface Book {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  barcode: string | null;
  category: string | null;
  publisher: string | null;
  publication_year: number | null;
  total_copies: number | null;
  available_copies: number | null;
  location: string | null;
  cover_url: string | null;
  subject_name?: string | null;
  created_at: string;
}

interface Borrowing {
  id: string;
  student_id: string;
  student_name?: string;
  borrowed_at: string | null;
  due_date: string;
  returned_at: string | null;
  status: string | null;
}

interface Fine {
  id: string;
  borrowing_id: string;
  amount: number;
  reason: string;
  paid: boolean;
  created_at: string;
}

interface Student {
  id: string;
  full_name: string;
  admission_number: string;
}

interface Subject {
  id: string;
  name: string;
}

const CATEGORIES = ["Fiction", "Non-Fiction", "Science", "Mathematics", "History", "Geography", "Literature", "Reference", "Textbook", "Biography", "Religion", "Art", "Technology", "Other"];

export default function LibraryManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showBorrow, setShowBorrow] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showAddFine, setShowAddFine] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedBorrowing, setSelectedBorrowing] = useState<Borrowing | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [form, setForm] = useState({
    title: "",
    author: "",
    isbn: "",
    barcode: "",
    category: "Fiction",
    publisher: "",
    publication_year: "",
    total_copies: "1",
    location: "",
    subject_id: "",
    cover_url: "",
  });

  const [borrowForm, setBorrowForm] = useState({
    student_id: "",
    due_date: "",
  });

  const [fineForm, setFineForm] = useState({
    amount: "",
    reason: "",
  });

  useEffect(() => {
    if (!authLoading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("q", search.trim());

      const data = await apiGet<{ resources: Book[] }>(`/api/admin/library?${params.toString()}`);
      setBooks(data.resources || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, statusFilter, search]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [studentsRes, subjectsRes] = await Promise.all([
        apiGet<{ students: Array<{ id: string; full_name: string; students?: { admission_number?: string } }> }>("/api/admin/students?status=active"),
        apiGet<{ subjects: Subject[] }>("/api/admin/subjects"),
      ]);
      setStudents((studentsRes.students || []).map((s) => ({
        id: s.id,
        full_name: s.full_name || "",
        admission_number: s.students?.admission_number || "",
      })));
      setSubjects(subjectsRes.subjects || []);
    } catch (err: unknown) {
      console.error("Failed to load reference data:", err);
    }
  }, []);

  useEffect(() => {
    if (user?.user_category === "admin") {
      fetchBooks();
      fetchReferenceData();
    }
  }, [user, fetchBooks, fetchReferenceData]);

  const resetForm = () => {
    setForm({
      title: "", author: "", isbn: "", barcode: "", category: "Fiction",
      publisher: "", publication_year: "", total_copies: "1",
      location: "", subject_id: "", cover_url: "",
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      await apiPost("/api/admin/library", {
        title: form.title.trim(),
        author: form.author || null,
        isbn: form.isbn || null,
        barcode: form.barcode || null,
        category: form.category,
        publisher: form.publisher || null,
        publication_year: form.publication_year ? Number(form.publication_year) : null,
        total_copies: Number(form.total_copies) || 1,
        location: form.location || null,
        subject_id: form.subject_id || null,
        cover_url: form.cover_url || null,
      });
      toast.success("Book added to catalog");
      resetForm();
      setShowCreate(false);
      fetchBooks();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    setSaving(true);
    try {
      await apiPatch("/api/admin/library", {
        id: selectedBook.id,
        title: form.title.trim(),
        author: form.author || null,
        isbn: form.isbn || null,
        barcode: form.barcode || null,
        category: form.category,
        publisher: form.publisher || null,
        publication_year: form.publication_year ? Number(form.publication_year) : null,
        total_copies: Number(form.total_copies) || 1,
        location: form.location || null,
        subject_id: form.subject_id || null,
        cover_url: form.cover_url || null,
      });
      toast.success("Book updated");
      setShowEdit(false);
      setSelectedBook(null);
      fetchBooks();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this book from the catalog?")) return;
    setDeletingId(id);
    try {
      await apiDelete(`/api/admin/library?id=${id}`);
      setBooks((prev) => prev.filter((b) => b.id !== id));
      toast.success("Book deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (book: Book) => {
    setSelectedBook(book);
    setForm({
      title: book.title,
      author: book.author || "",
      isbn: book.isbn || "",
      barcode: book.barcode || "",
      category: book.category || "Fiction",
      publisher: book.publisher || "",
      publication_year: book.publication_year ? String(book.publication_year) : "",
      total_copies: String(book.total_copies || 1),
      location: book.location || "",
      subject_id: "",
      cover_url: book.cover_url || "",
    });
    setShowEdit(true);
  };

  const openDetail = async (book: Book) => {
    setSelectedBook(book);
    setShowDetail(true);
    setLoadingDetail(true);
    try {
      const data = await apiGet<{ resource: Book; borrowings: Borrowing[]; fines: Fine[] }>(`/api/admin/library?id=${book.id}&borrowings=true`);
      setBorrowings(data.borrowings || []);
      setFines(data.fines || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingDetail(false);
    }
  };

  const openBorrow = (book: Book) => {
    setSelectedBook(book);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    setBorrowForm({
      student_id: "",
      due_date: dueDate.toISOString().split("T")[0],
    });
    setShowBorrow(true);
  };

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    if (!borrowForm.student_id) { toast.error("Select a student"); return; }
    if (!borrowForm.due_date) { toast.error("Due date is required"); return; }
    setSaving(true);
    try {
      await apiPost("/api/admin/library", {
        action: "borrow",
        resource_id: selectedBook.id,
        student_id: borrowForm.student_id,
        due_date: borrowForm.due_date,
      });
      toast.success("Book borrowed successfully");
      setShowBorrow(false);
      fetchBooks();
      if (showDetail) {
        const data = await apiGet<{ borrowings: Borrowing[] }>(`/api/admin/library?id=${selectedBook.id}&borrowings=true`);
        setBorrowings(data.borrowings || []);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async (borrowing: Borrowing) => {
    if (!confirm("Mark this book as returned?")) return;
    try {
      await apiPost("/api/admin/library", {
        action: "return",
        borrowing_id: borrowing.id,
      });
      setBorrowings((prev) => prev.map((b) => b.id === borrowing.id ? { ...b, returned_at: new Date().toISOString(), status: "returned" } : b));
      toast.success("Book returned");
      fetchBooks();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const openAddFine = (borrowing: Borrowing) => {
    setSelectedBorrowing(borrowing);
    setFineForm({ amount: "", reason: "" });
    setShowAddFine(true);
  };

  const handleAddFine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBorrowing) return;
    if (!fineForm.amount || Number(fineForm.amount) <= 0) { toast.error("Valid amount is required"); return; }
    if (!fineForm.reason.trim()) { toast.error("Reason is required"); return; }
    setSaving(true);
    try {
      await apiPost("/api/admin/library", {
        action: "add_fine",
        borrowing_id: selectedBorrowing.id,
        amount: Number(fineForm.amount),
        reason: fineForm.reason.trim(),
      });
      toast.success("Fine added");
      setShowAddFine(false);
      setSelectedBorrowing(null);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  const stats = {
    total: books.length,
    totalCopies: books.reduce((sum, b) => sum + (b.total_copies || 0), 0),
    available: books.reduce((sum, b) => sum + (b.available_copies || 0), 0),
    borrowed: books.reduce((sum, b) => sum + (b.total_copies || 0) - (b.available_copies || 0), 0),
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (user?.user_category !== "admin") return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Library Management</h1>
          <p className="text-slate-400">Catalog books, track borrowings, and manage fines</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreate(true); }} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Add Book
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Books", value: stats.total, icon: Library, color: "text-[#D4AF37]" },
          { label: "Total Copies", value: stats.totalCopies, icon: BookOpen, color: "text-blue-400" },
          { label: "Available", value: stats.available, icon: BookCheck, color: "text-emerald-400" },
          { label: "Borrowed", value: stats.borrowed, icon: BookX, color: "text-amber-400" },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 flex items-center gap-3 bg-slate-900/60 border-slate-700/50 rounded-2xl">
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
            <div>
              <p className="text-xl font-bold text-slate-100">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input placeholder="Search by title, author, ISBN, barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-slate-900/60 border-slate-700/50 text-slate-100 placeholder:text-slate-600 rounded-xl" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <Button onClick={fetchBooks} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold rounded-xl">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </motion.div>

      {/* Books Grid */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Library className="w-12 h-12 mb-3 text-slate-600" />
            <p className="text-lg font-medium text-slate-400">No books found</p>
            <p className="text-sm">Add your first book to the catalog</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {books.map((book, index) => (
                <motion.div key={book.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ delay: index * 0.03 }}>
                  <Card className="p-4 bg-slate-900/60 border-slate-700/50 rounded-2xl hover:border-[#D4AF37]/30 transition-colors group">
                    <div className="flex gap-3">
                      <div className="w-16 h-20 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700/50 shrink-0">
                        {book.cover_url ? (
                          <Image src={book.cover_url} alt={book.title} width={64} height={80} className="object-cover" />
                        ) : (
                          <BookOpen className="w-6 h-6 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-200 truncate">{book.title}</h3>
                        <p className="text-xs text-slate-500 truncate">{book.author || "Unknown Author"}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant={(book.available_copies || 0) > 0 ? "success" : "secondary"} className="text-[10px]">
                            {(book.available_copies || 0)} / {(book.total_copies || 0)} available
                          </Badge>
                          {book.category && <Badge variant="info" className="text-[10px]">{book.category}</Badge>}
                        </div>
                        {book.isbn && <p className="text-[10px] text-slate-600 mt-1">ISBN: {book.isbn}</p>}
                        {book.barcode && <p className="text-[10px] text-slate-600">Barcode: {book.barcode}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-800">
                      <Button size="sm" variant="ghost" onClick={() => openDetail(book)} className="text-slate-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openBorrow(book)} disabled={(book.available_copies || 0) < 1} className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/10">
                        <BookCheck className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(book)} className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(book.id)} disabled={deletingId === book.id} className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 ml-auto">
                        {deletingId === book.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); resetForm(); }} title="Add Book to Catalog" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Title *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Book title" required className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Author</label>
              <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Author name" className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">ISBN</label>
              <Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} placeholder="978-3-16-148410-0" className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Barcode</label>
              <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Scan or enter barcode" className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Publisher</label>
              <Input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} placeholder="Publisher name" className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Publication Year</label>
              <Input type="number" value={form.publication_year} onChange={(e) => setForm({ ...form, publication_year: e.target.value })} placeholder="2024" className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Total Copies *</label>
              <Input type="number" value={form.total_copies} onChange={(e) => setForm({ ...form, total_copies: e.target.value })} placeholder="1" required className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Location</label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Shelf A-3" className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Subject</label>
              <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                <option value="">None</option>
                {subjects.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Cover URL</label>
              <Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="https://..." className="bg-slate-900/60 border-slate-700/50" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Add Book
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowCreate(false); resetForm(); }} className="border-slate-700/50 text-slate-300">Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => { setShowEdit(false); setSelectedBook(null); }} title="Edit Book" size="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Title *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Author</label>
              <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">ISBN</label>
              <Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Barcode</label>
              <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Publisher</label>
              <Input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Publication Year</label>
              <Input type="number" value={form.publication_year} onChange={(e) => setForm({ ...form, publication_year: e.target.value })} className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Total Copies *</label>
              <Input type="number" value={form.total_copies} onChange={(e) => setForm({ ...form, total_copies: e.target.value })} required className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Location</label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Subject</label>
              <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                <option value="">None</option>
                {subjects.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Cover URL</label>
              <Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} className="bg-slate-900/60 border-slate-700/50" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              Update Book
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowEdit(false); setSelectedBook(null); }} className="border-slate-700/50 text-slate-300">Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Borrow Modal */}
      <Modal isOpen={showBorrow} onClose={() => { setShowBorrow(false); setSelectedBook(null); }} title={`Borrow: ${selectedBook?.title}`} size="md">
        <form onSubmit={handleBorrow} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Student *</label>
            <select value={borrowForm.student_id} onChange={(e) => setBorrowForm({ ...borrowForm, student_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm" required>
              <option value="">Select student</option>
              {students.map((s) => (<option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Due Date *</label>
            <Input type="date" value={borrowForm.due_date} onChange={(e) => setBorrowForm({ ...borrowForm, due_date: e.target.value })} required className="bg-slate-900/60 border-slate-700/50" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <BookCheck className="w-4 h-4 mr-1" />}
              Borrow Book
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowBorrow(false); setSelectedBook(null); }} className="border-slate-700/50 text-slate-300">Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Add Fine Modal */}
      <Modal isOpen={showAddFine} onClose={() => { setShowAddFine(false); setSelectedBorrowing(null); }} title="Add Fine" size="md">
        <form onSubmit={handleAddFine} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Amount (KES) *</label>
            <Input type="number" value={fineForm.amount} onChange={(e) => setFineForm({ ...fineForm, amount: e.target.value })} placeholder="e.g. 500" required className="bg-slate-900/60 border-slate-700/50" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Reason *</label>
            <textarea value={fineForm.reason} onChange={(e) => setFineForm({ ...fineForm, reason: e.target.value })} placeholder="Reason for fine..." required rows={3} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 resize-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <DollarSign className="w-4 h-4 mr-1" />}
              Add Fine
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowAddFine(false); setSelectedBorrowing(null); }} className="border-slate-700/50 text-slate-300">Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => { setShowDetail(false); setSelectedBook(null); }} title={selectedBook?.title || "Book Details"} size="xl">
        {loadingDetail ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          </div>
        ) : selectedBook && (
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="w-24 h-32 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700/50 shrink-0">
                {selectedBook.cover_url ? (
                  <Image src={selectedBook.cover_url} alt={selectedBook.title} width={96} height={128} className="object-cover" />
                ) : (
                  <BookOpen className="w-10 h-10 text-slate-500" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 flex-1">
                <div><p className="text-xs text-slate-500">Author</p><p className="text-slate-200">{selectedBook.author || "—"}</p></div>
                <div><p className="text-xs text-slate-500">ISBN</p><p className="text-slate-200">{selectedBook.isbn || "—"}</p></div>
                <div><p className="text-xs text-slate-500">Barcode</p><p className="text-slate-200">{selectedBook.barcode || "—"}</p></div>
                <div><p className="text-xs text-slate-500">Category</p><p className="text-slate-200">{selectedBook.category || "—"}</p></div>
                <div><p className="text-xs text-slate-500">Publisher</p><p className="text-slate-200">{selectedBook.publisher || "—"}</p></div>
                <div><p className="text-xs text-slate-500">Year</p><p className="text-slate-200">{selectedBook.publication_year || "—"}</p></div>
                <div><p className="text-xs text-slate-500">Location</p><p className="text-slate-200">{selectedBook.location || "—"}</p></div>
                <div><p className="text-xs text-slate-500">Copies</p><p className="text-slate-200">{(selectedBook.available_copies || 0)} / {(selectedBook.total_copies || 0)} available</p></div>
              </div>
            </div>

            {/* Borrowings */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <BookCheck className="w-4 h-4 text-blue-400" />
                Borrowing History ({borrowings.length})
              </h4>
              {borrowings.length === 0 ? (
                <div className="text-center py-6 text-slate-500 bg-slate-900/40 rounded-xl">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p>No borrowings yet</p>
                </div>
              ) : (
                <Table>
                  <TableHead>
                    <tr><TableHeader>Student</TableHeader><TableHeader>Borrowed</TableHeader><TableHeader>Due</TableHeader><TableHeader>Status</TableHeader><TableHeader className="text-right">Actions</TableHeader></tr>
                  </TableHead>
                  <TableBody>
                    {borrowings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/50">
                        <TableCell><span className="text-slate-200">{b.student_name || b.student_id}</span></TableCell>
                        <TableCell><span className="text-xs text-slate-400">{b.borrowed_at ? new Date(b.borrowed_at).toLocaleDateString() : "—"}</span></TableCell>
                        <TableCell>
                          <span className={`text-xs ${isOverdue(b.due_date) && !b.returned_at ? "text-red-400 font-medium" : "text-slate-400"}`}>
                            {new Date(b.due_date).toLocaleDateString()}
                            {isOverdue(b.due_date) && !b.returned_at && " (OVERDUE)"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={b.returned_at ? "success" : isOverdue(b.due_date) ? "danger" : "info"}>
                            {b.returned_at ? "Returned" : isOverdue(b.due_date) ? "Overdue" : "Borrowed"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {!b.returned_at && (
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleReturn(b)} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                                <BookCheck className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openAddFine(b)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                <DollarSign className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Fines */}
            {fines.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Fines ({fines.length})
                </h4>
                <Table>
                  <TableHead>
                    <tr><TableHeader>Amount</TableHeader><TableHeader>Reason</TableHeader><TableHeader>Status</TableHeader></tr>
                  </TableHead>
                  <TableBody>
                    {fines.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-800/50">
                        <TableCell><span className="text-red-400 font-medium">KES {f.amount}</span></TableCell>
                        <TableCell><span className="text-slate-300">{f.reason}</span></TableCell>
                        <TableCell><Badge variant={f.paid ? "success" : "danger"}>{f.paid ? "Paid" : "Unpaid"}</Badge></TableCell>
                      </tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
