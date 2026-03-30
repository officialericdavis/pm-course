import { useState, useEffect } from "react";
import { StudentLayout } from "../../components/layouts/student-layout";
import { User, Mail, Lock, Save, Eye, EyeOff, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { projectId } from "/utils/supabase/info";
import { useAuth } from "../../../contexts/auth";
import { useNavigate } from "react-router";

export function StudentProfile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete account modal
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0); // 0=closed, 1=confirm, 2=password
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    if (!token) return;

    setSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/user/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUser(data.user); // update auth context
        toast.success("Profile updated successfully!");
      } else {
        toast.error("Failed to update profile.");
      }
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match!");
      return;
    }
    toast.info("Password changes are not yet supported.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) { toast.error("Enter your password"); return; }
    setDeleting(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/user/account`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ password: deletePassword }),
        }
      );
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to delete account"); setDeleting(false); return; }
      localStorage.removeItem("access_token");
      setUser(null);
      navigate("/");
      toast.success("Account deleted.");
    } catch {
      toast.error("An error occurred. Please try again.");
      setDeleting(false);
    }
  };

  const completedCount = user?.completedModules?.length ?? 0;
  const percentage = Math.round((completedCount / 7) * 100);
  const enrolledDate = user?.enrolledAt
    ? new Date(user.enrolledAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <StudentLayout>
      <div className="p-8">
        <h1 className="text-4xl font-black mb-2">Profile Settings</h1>
        <p className="text-neutral-600 mb-8">Manage your account information</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <div className="bg-white border-2 border-black p-8">
            <h2 className="text-2xl font-black mb-6">Profile Information</h2>

            <form onSubmit={handleUpdateProfile}>
              <div className="mb-6">
                <label htmlFor="name" className="block text-sm font-bold mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black pl-10"
                    required
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2" size={20} />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-bold mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={user?.email ?? ""}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none bg-neutral-100 pl-10"
                    disabled
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2" size={20} />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-black text-white px-8 py-4 font-bold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={20} />
                {saving ? "SAVING..." : "SAVE CHANGES"}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white border-2 border-black p-8">
            <h2 className="text-2xl font-black mb-6">Change Password</h2>

            <form onSubmit={handleUpdatePassword}>
              <div className="mb-6">
                <label htmlFor="current-password" className="block text-sm font-bold mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black pl-10"
                    required
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2" size={20} />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="new-password" className="block text-sm font-bold mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black pl-10"
                    required
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2" size={20} />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="confirm-password" className="block text-sm font-bold mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black pl-10"
                    required
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2" size={20} />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white px-8 py-4 font-bold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
              >
                <Lock size={20} />
                UPDATE PASSWORD
              </button>
            </form>
          </div>

          {/* Account Stats */}
          <div className="bg-white border-2 border-black p-8">
            <h2 className="text-2xl font-black mb-6">Account Stats</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-neutral-200 pb-4">
                <p className="font-bold">Member Since</p>
                <p className="text-neutral-600">{enrolledDate}</p>
              </div>

              <div className="flex items-center justify-between border-b-2 border-neutral-200 pb-4">
                <p className="font-bold">Course Progress</p>
                <p className="text-neutral-600">{percentage}% Complete</p>
              </div>

              <div className="flex items-center justify-between border-b-2 border-neutral-200 pb-4">
                <p className="font-bold">Modules Completed</p>
                <p className="text-neutral-600">{completedCount} / 7</p>
              </div>

              <div className="flex items-center justify-between pb-4">
                <p className="font-bold">Account Status</p>
                <span className="px-3 py-1 rounded text-xs font-bold border bg-green-100 text-green-800 border-green-300">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 border-2 border-red-500 p-8">
            <h2 className="text-2xl font-black mb-4 text-red-800">Danger Zone</h2>
            <p className="text-sm text-red-700 mb-6">
              These actions are permanent and cannot be undone.
            </p>
            <button
              onClick={() => { setDeleteStep(1); setDeletePassword(""); }}
              className="w-full bg-red-600 text-white px-8 py-4 font-bold hover:bg-red-700 transition-colors"
            >
              DELETE ACCOUNT
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal — Step 1: Are you sure? */}
      {deleteStep === 1 && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-white border-2 border-red-500 p-8 w-full max-w-md relative">
            <button onClick={() => setDeleteStep(0)} className="absolute top-4 right-4 text-neutral-400 hover:text-black">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={28} className="text-red-600 shrink-0" />
              <h2 className="text-2xl font-black text-red-800">Delete Account</h2>
            </div>
            <p className="text-neutral-700 mb-3">
              Are you sure you want to permanently delete your account?
            </p>
            <ul className="text-sm text-neutral-600 space-y-1 mb-6 list-disc pl-5">
              <li>Your login access will be removed immediately</li>
              <li>Your course progress will be lost</li>
              <li>Your saved location data will be retained for record-keeping</li>
              <li><strong>This cannot be undone</strong></li>
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteStep(0)}
                className="flex-1 border-2 border-black py-3 font-bold hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setDeleteStep(2)}
                className="flex-1 bg-red-600 text-white py-3 font-bold hover:bg-red-700 transition-colors"
              >
                Yes, Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal — Step 2: Enter password */}
      {deleteStep === 2 && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-white border-2 border-red-500 p-8 w-full max-w-sm relative">
            <button onClick={() => setDeleteStep(0)} className="absolute top-4 right-4 text-neutral-400 hover:text-black">
              <X size={20} />
            </button>
            <h2 className="text-2xl font-black mb-1 text-red-800">Confirm Deletion</h2>
            <p className="text-sm text-neutral-600 mb-6">Enter your password to permanently delete your account.</p>

            <label className="block text-sm font-bold mb-2">Your Password</label>
            <div className="relative mb-6">
              <input
                type={showDeletePassword ? "text" : "password"}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDeleteAccount()}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowDeletePassword(v => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-black"
              >
                {showDeletePassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteStep(1)}
                className="flex-1 border-2 border-black py-3 font-bold hover:bg-neutral-100 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || !deletePassword.trim()}
                className="flex-1 bg-red-600 text-white py-3 font-bold hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {deleting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
