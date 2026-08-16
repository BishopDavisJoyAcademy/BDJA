"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PlatformSettings {
  school_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  timezone: string;
  academic_year: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>({
    school_name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    timezone: "Africa/Nairobi",
    academic_year: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<{ settings: PlatformSettings | null }>("/api/admin/settings")
      .then((d) => {
        if (d.settings) setSettings(d.settings);
        setLoading(false);
      })
      .catch((err) => { toast.error(getErrorMessage(err)); setLoading(false); });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to save settings");
      toast.success("Settings saved");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">School Name</label>
            <Input name="school_name" defaultValue={settings.school_name} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Contact Email</label>
            <Input name="contact_email" type="email" defaultValue={settings.contact_email} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Contact Phone</label>
            <Input name="contact_phone" defaultValue={settings.contact_phone} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
            <Input name="address" defaultValue={settings.address} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Timezone</label>
            <Input name="timezone" defaultValue={settings.timezone} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Academic Year</label>
            <Input name="academic_year" defaultValue={settings.academic_year} required />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Settings"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
