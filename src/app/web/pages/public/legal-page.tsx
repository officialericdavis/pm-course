import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { Navbar } from "../../components/layouts/navbar";
import { Footer } from "../../components/layouts/footer";
import { projectId } from "/utils/supabase/info";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c`;

const PAGE_META: Record<string, { heading: string }> = {
  privacy: { heading: "Privacy Policy" },
  terms:   { heading: "Terms of Service" },
};

export function LegalPage() {
  const { pathname } = useLocation();
  // pathname is "/privacy" or "/terms" — strip leading slash
  const page = pathname.split("/").filter(Boolean)[0] ?? "";
  const [content, setContent] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const meta = PAGE_META[page] ?? { heading: "Legal" };

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`${API}/legal/${page}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setContent(data.content);
        setUpdatedAt(data.updatedAt);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-black tracking-tight mb-4">{meta.heading}</h1>
          {updatedAt && (
            <p className="text-sm text-neutral-400 mb-12">
              Last updated: {new Date(updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}

          {loading && (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-4 bg-neutral-100 rounded animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
              ))}
            </div>
          )}

          {error && (
            <p className="text-neutral-500">Failed to load content. Please try again later.</p>
          )}

          {!loading && !error && content && (
            <div className="space-y-4">
              {content.split("\n\n").map((block, i) => {
                const trimmed = block.trim();
                if (!trimmed) return null;
                // Numbered section heading e.g. "1. Title"
                if (/^\d+\./.test(trimmed)) {
                  const newline = trimmed.indexOf("\n");
                  const heading = newline === -1 ? trimmed : trimmed.slice(0, newline).trim();
                  const body = newline === -1 ? "" : trimmed.slice(newline).trim();
                  return (
                    <div key={i} className="pt-4">
                      <h2 className="text-xl font-black mb-2">{heading}</h2>
                      {body && <p className="text-neutral-700 leading-relaxed">{body}</p>}
                    </div>
                  );
                }
                // Plain paragraph — render each line, preserve single newlines
                return (
                  <p key={i} className="text-neutral-700 leading-relaxed">
                    {trimmed.split("\n").map((line, j, arr) => (
                      <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                    ))}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}