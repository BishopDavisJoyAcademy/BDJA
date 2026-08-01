"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";
import { Plus, Save, Trash2, MapPin, Phone, Mail, Building, X } from "lucide-react";

interface Campus {
  id: string;
  name: string;
  location: string;
  phone: string;
  email: string;
  created_at: string;
}

export default function CampusesPage() {
  const { user } = useAuth();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [editing, setEditing] = useState<Partial<Campus> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampuses();
  }, []);

  const loadCampuses = async () => {
    setLoading(true);
    const { data } = await supabase.from("campuses").select("*").order("name");
    setCampuses(data || []);
    setLoading(false);
  };

  const saveCampus = async () => {
    if (!editing?.name || !editing?.location) {
      toast.error("Name and location are required");
      return;
    }
    const payload = {
      name: editing.name,
      location: editing.location,
      phone: editing.phone || "",
      email: editing.email || "",
    };
    const { error } = editing.id
      ? await supabase.from("campuses").update(payload).eq("id", editing.id)
      : await supabase.from("campuses").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("Campus saved"); setEditing(null); loadCampuses(); }
  };

  const deleteCampus = async (id: string) => {
    if (!confirm("Delete this campus? This may affect linked records.")) return;
    const { error } = await supabase.from("campuses").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Campus deleted"); loadCampuses(); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-bdja-primary to-bdja-accent rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Campus Management</h1>
        <p className="text-white/80 mt-1">Manage all school campuses and locations</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setEditing({ name: "", location: "", phone: "", email: "" })}>
          <Plus className="w-4 h-4 mr-1" /> Add Campus
        </Button>
      </div>

      {editing && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editing.id ? "Edit Campus" : "New Campus"}</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Campus Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Input placeholder="Location" value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
            <div className="grid md:grid-cols-2 gap-3">
              <Input placeholder="Phone" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              <Input placeholder="Email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveCampus}><Save className="w-4 h-4 mr-1" /> Save</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campuses.map((campus) => (
          <Card key={campus.id} className="card-hover">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-bdja-primary/10 rounded-lg flex items-center justify-center">
                    <Building className="w-5 h-5 text-bdja-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-bdja-dark">{campus.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {campus.location}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-xs text-gray-500">
                {campus.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {campus.phone}</p>}
                {campus.email && <p className="flex items-center gap-1"><Mail className="w-3 h-3" /> {campus.email}</p>}
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(campus)}>Edit</Button>
                <Button size="sm" variant="danger" onClick={() => deleteCampus(campus.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
