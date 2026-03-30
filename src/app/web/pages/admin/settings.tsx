import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/layouts/admin-layout";
import { toast } from "sonner";
import { projectId } from "/utils/supabase/info";

export function AdminSettings() {
  const [name, setName] = useState("");
  const [platformName, setPlatformName] = useState("");
  const [coursePrice, setCoursePrice] = useState("");
  const [emailFromName, setEmailFromName] = useState("");
  const [emailFromEmail, setEmailFromEmail] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    Promise.all([
      fetch(`https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/user`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/settings`).then((r) => r.json()),
    ])
      .then(([userData, settingsData]) => {
        if (userData.user) setName(userData.user.name ?? "");
        if (settingsData.settings) {
          setPlatformName(settingsData.settings.platformName ?? "");
          setCoursePrice(settingsData.settings.coursePrice ?? "");
          setEmailFromName(settingsData.settings.emailFromName ?? "");
          const storedEmail = settingsData.settings.emailFromEmail ?? "";
          setEmailFromEmail(storedEmail.includes("@") ? storedEmail.split("@")[0] : storedEmail);
        }
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoadingProfile(false));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    if (!token) return;

    setSavingProfile(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/user/profile`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name }),
        }
      );
      if (res.ok) toast.success("Profile updated!");
      else toast.error("Failed to update profile");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    if (!token) return;

    setSavingPlatform(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/settings`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ platformName, coursePrice }),
        }
      );
      if (res.ok) toast.success("Platform settings saved!");
      else toast.error("Failed to save settings");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSavingPlatform(false);
    }
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    if (!token) return;

    setSavingEmail(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/settings`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ emailFromName, emailFromEmail: `${emailFromEmail}@petermayberry.com` }),
        }
      );
      if (res.ok) toast.success("Email settings saved!");
      else toast.error("Failed to save email settings");
    } catch {
      toast.error("Failed to save email settings");
    } finally {
      setSavingEmail(false);
    }
  };

  if (loadingProfile) {
    return (
      <AdminLayout>
        <div className="p-8 text-center py-12 text-neutral-500">Loading settings...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-4xl font-black mb-8">Settings</h1>

        <div className="max-w-2xl space-y-8">
          {/* Admin Profile */}
          <div className="bg-white border-2 border-black p-8">
            <h2 className="text-xl font-black mb-6">Admin Profile</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="bg-black text-white px-8 py-3 font-bold hover:bg-neutral-800 disabled:opacity-50"
              >
                {savingProfile ? "SAVING..." : "SAVE PROFILE"}
              </button>
            </form>
          </div>

          {/* Email Settings */}
          <div className="bg-white border-2 border-black p-8">
            <h2 className="text-xl font-black mb-2">Email Settings</h2>
            <p className="text-sm text-neutral-500 mb-6">Default sender for email marketing campaigns</p>
            <form onSubmit={handleSaveEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">From Name</label>
                <input
                  type="text"
                  value={emailFromName}
                  onChange={(e) => setEmailFromName(e.target.value)}
                  placeholder="Peter Mayberry"
                  className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">From Email</label>
                <div className="flex border-2 border-black focus-within:ring-2 focus-within:ring-black">
                  <input
                    type="text"
                    required
                    value={emailFromEmail}
                    onChange={(e) => setEmailFromEmail(e.target.value.replace(/@.*/, ""))}
                    placeholder="Peter"
                    className="flex-1 px-4 py-3 focus:outline-none"
                  />
                  <span className="bg-neutral-100 px-4 py-3 font-bold text-neutral-500 border-l-2 border-black select-none">
                    @petermayberry.com
                  </span>
                </div>
              </div>
              <button
                type="submit"
                disabled={savingEmail || !emailFromEmail.trim()}
                className="bg-black text-white px-8 py-3 font-bold hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingEmail ? "SAVING..." : "SAVE EMAIL SETTINGS"}
              </button>
            </form>
          </div>

          {/* Platform Settings */}
          <div className="bg-white border-2 border-black p-8">
            <h2 className="text-xl font-black mb-6">Platform Settings</h2>
            <form onSubmit={handleSavePlatform} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Platform Name</label>
                <input
                  type="text"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Course Price</label>
                <input
                  type="text"
                  value={coursePrice}
                  onChange={(e) => setCoursePrice(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="$997"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={savingPlatform}
                className="bg-black text-white px-8 py-3 font-bold hover:bg-neutral-800 disabled:opacity-50"
              >
                {savingPlatform ? "SAVING..." : "SAVE SETTINGS"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
