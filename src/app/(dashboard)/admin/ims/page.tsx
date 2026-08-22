"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Loader2, Plus, Trash2, Edit3, X, Save, Search, Package, Filter } from "lucide-react";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  quantity: number;
  unit: string;
  location: string | null;
  condition: string;
  assigned_to: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  supplier: string | null;
  serial_number: string | null;
  barcode: string | null;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = ["Furniture", "Electronics", "Stationery", "Sports", "Laboratory", "Library", "IT Equipment", "Cleaning", "Other"];
const CONDITIONS = ["excellent", "good", "fair", "poor", "damaged"];
const UNITS = ["pcs", "sets", "boxes", "kg", "litres", "pairs", "bundles"];

export default function IMSPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "Furniture",
    quantity: 1,
    unit: "pcs",
    location: "",
    condition: "good",
    assigned_to: "",
    purchase_date: "",
    purchase_cost: "",
    supplier: "",
    serial_number: "",
    barcode: "",
    is_active: true,
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ items: InventoryItem[] }>("/api/admin/ims");
      setItems(data.items || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: "", description: "", category: "Furniture", quantity: 1, unit: "pcs", location: "", condition: "good", assigned_to: "", purchase_date: "", purchase_cost: "", supplier: "", serial_number: "", barcode: "", is_active: true });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Item name is required"); return; }
    try {
      const body = { ...form, quantity: Number(form.quantity), purchase_cost: form.purchase_cost ? Number(form.purchase_cost) : null };
      if (editingId) {
        await apiPut("/api/admin/ims", { id: editingId, ...body });
        toast.success("Item updated");
      } else {
        await apiPost("/api/admin/ims", body);
        toast.success("Item added");
      }
      resetForm();
      setShowForm(false);
      fetchItems();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this inventory item?")) return;
    try {
      await apiDelete(`/api/admin/ims?id=${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Item deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setForm({
      name: item.name,
      description: item.description || "",
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      location: item.location || "",
      condition: item.condition,
      assigned_to: item.assigned_to || "",
      purchase_date: item.purchase_date ? item.purchase_date.slice(0, 10) : "",
      purchase_cost: item.purchase_cost?.toString() || "",
      supplier: item.supplier || "",
      serial_number: item.serial_number || "",
      barcode: item.barcode || "",
      is_active: item.is_active,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const filtered = items.filter((i) => {
    const q = search.toLowerCase();
    const matchesSearch = i.name.toLowerCase().includes(q) || (i.serial_number || "").toLowerCase().includes(q) || (i.barcode || "").toLowerCase().includes(q);
    const matchesCategory = filterCategory === "all" || i.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
          <p className="text-sm text-gray-400 mt-1">Track school assets and supplies</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Plus className="w-4 h-4 mr-1" /> Add Item</>}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <h3 className="font-semibold text-white mb-4">{editingId ? "Edit Item" : "New Inventory Item"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Item Name *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dell Laptop" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Quantity</label>
                <Input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Unit</label>
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Condition</label>
                <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm">
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Location</label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Lab 1" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Assigned To</label>
                <Input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} placeholder="Staff name" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Purchase Date</label>
                <Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Purchase Cost (KES)</label>
                <Input type="number" min={0} value={form.purchase_cost} onChange={(e) => setForm({ ...form, purchase_cost: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Supplier</label>
                <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Supplier name" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Serial Number</label>
                <Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Barcode</label>
                <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm resize-y" placeholder="Item description..." />
              </div>
              <div className="flex items-center gap-2 md:col-span-3">
                <input type="checkbox" id="item-active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-gray-600 text-amber-400" />
                <label htmlFor="item-active" className="text-sm text-gray-300">Active</label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit"><Save className="w-4 h-4 mr-1" />{editingId ? "Update Item" : "Save Item"}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search inventory..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm">
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-gray-300">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Qty</th>
              <th className="px-4 py-3 text-left">Condition</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map((item) => (
              <tr key={item.id} className="text-gray-300 hover:bg-slate-800/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.serial_number && <p className="text-xs text-gray-500">S/N: {item.serial_number}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><Badge className="bg-slate-700 text-gray-300 text-xs border-0">{item.category}</Badge></td>
                <td className="px-4 py-3">{item.quantity} {item.unit}</td>
                <td className="px-4 py-3">
                  <Badge className={`text-xs border-0 ${
                    item.condition === "excellent" ? "bg-emerald-500/10 text-emerald-400" :
                    item.condition === "good" ? "bg-blue-500/10 text-blue-400" :
                    item.condition === "fair" ? "bg-amber-500/10 text-amber-400" :
                    item.condition === "poor" ? "bg-orange-500/10 text-orange-400" :
                    "bg-red-500/10 text-red-400"
                  }`}>{item.condition}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-400">{item.location || "—"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}><Edit3 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No inventory items found.</p>
        </div>
      )}
    </div>
  );
}
