"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { hasPermission } from "@/lib/permissions";
import { Settings, User, Shield, Bell } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({ full_name: "", phone: "" });
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
    setProfile(data);
    setFormData({ full_name: data?.full_name || "", phone: data?.phone || "" });
    setLoading(false);
  };

  const updateProfile = async () => {
    const { error } = await supabase.from("profiles").update(formData).eq("id", user!.id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Profile updated");
  };

  const changePassword = async () => {
    if (passwordData.new !== passwordData.confirm) { toast.error("Passwords don't match"); return; }
    if (passwordData.new.length < 8) { toast.error("Minimum 8 characters"); return; }
    const { error } = await supabase.auth.updateUser({ password: passwordData.new });
    if (error) { toast.error(error.message); return; }
    toast.success("Password changed");
    setPasswordData({ current: "", new: "", confirm: "" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-bdja-dark">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-bdja-primary" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input value={profile?.email} disabled className="bg-gray-50" />
          </div>
          <Button variant="primary" onClick={updateProfile}>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-bdja-primary" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="password" placeholder="New Password" value={passwordData.new} onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })} />
          <Input type="password" placeholder="Confirm New Password" value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} />
          <Button variant="primary" onClick={changePassword}>Update Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}
