import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/layouts/admin-layout";
import { toast } from "sonner";
import { projectId } from "/utils/supabase/info";
import { ExternalLink } from "lucide-react";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c`;

type PageKey = "privacy" | "terms";

const PAGES: { key: PageKey; label: string; path: string }[] = [
  { key: "privacy", label: "Privacy Policy",   path: "/privacy" },
  { key: "terms",   label: "Terms of Service", path: "/terms"   },
];

export function AdminLegal() {
  const [active, setActive] = useState<PageKey>("privacy");
  const [contents, setContents] = useState<Record<PageKey, string>>({ privacy: "", terms: "" });
  const [loading, setLoading] = useState<Record<PageKey, boolean>>({ privacy: true, terms: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (["privacy", "terms"] as PageKey[]).forEach((page) => {
      fetch(`${API}/legal/${page}`)
        .then((r) => r.json())
        .then((data) => {
          setContents((prev) => ({ ...prev, [page]: data.content ?? "" }));
        })
        .catch(() => toast.error(`Failed to load ${page} page`))
        .finally(() => setLoading((prev) => ({ ...prev, [page]: false })));
    });
  }, []);

  const handleSave = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/legal/${active}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: contents[active] }),
      });
      if (res.ok) toast.success("Page saved!");
      else {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const isLoading = loading.privacy || loading.terms;

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black">Legal Pages</h1>
            <p className="text-neutral-500 mt-1 text-sm">Edit the content shown on your public legal pages</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 border-b-2 border-black">
          {PAGES.map(({ key, label, path }) => (
            <div key={key} className="flex items-center gap-2">
              <button
                onClick={() => setActive(key)}
                className={`px-6 py-3 font-bold text-sm transition-colors ${
                  active === key
                    ? "bg-black text-white"
                    : "text-neutral-500 hover:text-black"
                }`}
              >
                {label}
              </button>
              <a
                href={path}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-black transition-colors mr-4"
                title={`Preview ${label}`}
              >
                <ExternalLink size={14} />
              </a>
            </div>
          ))}
        </div>

        {/* Editor */}
        <div className="max-w-4xl">
          <div className="bg-white border-2 border-black">
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black bg-neutral-50">
              <div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
                  {PAGES.find((p) => p.key === active)?.label}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Use numbered sections (e.g. "1. Section Title") — they render as headings on the public page
                </p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving || isLoading}
                className="bg-black text-white px-6 py-2 font-bold text-sm hover:bg-neutral-800 disabled:opacity-50 transition-colors"
              >
                {saving ? "SAVING..." : "SAVE"}
              </button>
            </div>

            {isLoading ? (
              <div className="p-6 text-neutral-400 text-sm">Loading...</div>
            ) : (
              <textarea
                value={contents[active]}
                onChange={(e) => setContents((prev) => ({ ...prev, [active]: e.target.value }))}
                className="w-full h-[600px] p-6 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                placeholder={`Enter your ${PAGES.find((p) => p.key === active)?.label} content here...`}
                spellCheck={false}
              />
            )}
          </div>

          <p className="text-xs text-neutral-400 mt-3">
            Plain text editor. Separate paragraphs with a blank line. Start sections with a number and period (e.g. "1. Your Section") to render them as headings.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}