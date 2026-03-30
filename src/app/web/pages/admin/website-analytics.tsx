import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/layouts/admin-layout";
import { projectId } from "/utils/supabase/info";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { Globe, TrendingUp, MousePointer, Mail, MapPin } from "lucide-react";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c`;

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("access_token")}` };
}

const SECTION_LABELS: Record<string, string> = {
  "hero": "Hero",
  "about": "About Peter",
  "problem": "Problem",
  "how-it-works": "How It Works",
  "course": "Course Overview",
  "social-proof": "Testimonials",
  "personality-filter": "Is It For You?",
  "pricing": "Pricing",
  "final-cta": "Final CTA",
};

const SECTION_ORDER = ["hero","about","problem","how-it-works","course","social-proof","personality-filter","pricing","final-cta"];

const CTA_LABELS: Record<string, string> = {
  "hero-start": "Hero → Start Course",
  "hero-how-it-works": "Hero → See How It Works",
  "course-view-details": "Course → View Details",
  "pricing-start-now": "Pricing → Start Now",
  "final-cta-start": "Final CTA → Start Business",
};

export function AdminWebsiteAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hotMarkets, setHotMarkets] = useState<any[]>([]);
  const [hotMarketsLoading, setHotMarketsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/admin/website-analytics`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => toast.error("Failed to load website analytics"))
      .finally(() => setLoading(false));

    fetch(`${API}/admin/location-intelligence`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setHotMarkets(d.markets || []))
      .catch(() => {})
      .finally(() => setHotMarketsLoading(false));
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center py-20 text-neutral-500">Loading analytics...</div></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center py-20 text-neutral-500">No data available</div></AdminLayout>;

  const heroViews = data.sections["hero"] || 1;
  const funnelData = SECTION_ORDER.map(s => ({
    name: SECTION_LABELS[s] || s,
    views: data.sections[s] || 0,
    pct: Math.round(((data.sections[s] || 0) / heroViews) * 100),
  }));

  const ctaData = Object.entries(CTA_LABELS).map(([id, label]) => ({
    name: label,
    clicks: data.ctas[id] || 0,
  }));

  // Campaign conversions table
  const campaignRows = (data.campaigns || []).map((c: any) => ({
    ...c,
    conversions: c.refSlug ? (data.conversions[c.refSlug] || 0) : 0,
    conversionRate: c.refSlug && c.sentCount > 0
      ? ((data.conversions[c.refSlug] || 0) / c.sentCount * 100).toFixed(1)
      : null,
  }));

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <Globe size={32} />
          <h1 className="text-4xl font-black">Website Analytics</h1>
        </div>

        {/* Traffic KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Today", value: data.visits.today },
            { label: "This Week", value: data.visits.thisWeek },
            { label: "This Month", value: data.visits.thisMonth },
            { label: "All Time", value: data.visits.total },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border-2 border-black p-5 text-center">
              <p className="text-3xl font-black">{value}</p>
              <p className="text-sm text-neutral-600 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Traffic Over Time */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} />
            <h2 className="text-xl font-black">Visits — Last 30 Days</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.visits.byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v: any) => [v, "Visits"]} labelFormatter={l => `Date: ${l}`} />
              <Line type="monotone" dataKey="count" stroke="#000" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Visits by Hour */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <h2 className="text-xl font-black mb-4">Peak Traffic Hours</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.visits.byHour}>
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickFormatter={h => `${h}:00`} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v: any) => [v, "Visits"]} labelFormatter={h => `${h}:00`} />
              <Bar dataKey="count" fill="#000" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sales Page Funnel */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <h2 className="text-xl font-black mb-1">Sales Page Drop-off Funnel</h2>
          <p className="text-sm text-neutral-500 mb-4">How far visitors scroll down the page</p>
          <div className="space-y-3">
            {funnelData.map(({ name, views, pct }) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold">{name}</span>
                  <span className="text-neutral-500">{views} views ({pct}%)</span>
                </div>
                <div className="w-full bg-neutral-100 h-6 border border-neutral-200">
                  <div className="bg-black h-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Clicks */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MousePointer size={20} />
            <h2 className="text-xl font-black">CTA Button Clicks</h2>
          </div>
          <div className="space-y-3">
            {ctaData.map(({ name, clicks }) => (
              <div key={name} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                <span className="text-sm font-medium">{name}</span>
                <span className="font-black text-lg">{clicks}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hot Markets */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={20} />
            <h2 className="text-xl font-black">Hot Markets</h2>
          </div>
          <p className="text-sm text-neutral-500 mb-4">ZIPs your students are researching most — ranked by analysis count</p>
          {hotMarketsLoading ? (
            <p className="text-sm text-neutral-400">Loading...</p>
          ) : hotMarkets.length === 0 ? (
            <p className="text-sm text-neutral-400">No location analyses yet. Data will appear after students use the Analyze Location tool.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-100 border-b-2 border-black">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold">ZIP</th>
                    <th className="px-4 py-3 text-center font-bold">Analyses</th>
                    <th className="px-4 py-3 text-center font-bold">Avg Score</th>
                    <th className="px-4 py-3 text-center font-bold">Avg Renter %</th>
                    <th className="px-4 py-3 text-center font-bold">Avg Income</th>
                    <th className="px-4 py-3 text-center font-bold">Flagged Competitors</th>
                  </tr>
                </thead>
                <tbody>
                  {hotMarkets.map((m: any, i: number) => (
                    <tr key={m.zip} className={`${i % 2 === 0 ? "bg-white" : "bg-neutral-50"} border-b border-neutral-200`}>
                      <td className="px-4 py-3 font-black font-mono">{m.zip}</td>
                      <td className="px-4 py-3 text-center font-bold">{m.analysisCount}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                          m.avgViability >= 7 ? "bg-green-100 text-green-800" :
                          m.avgViability >= 5 ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {m.avgViability ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-neutral-600">
                        {m.avgRenterPct != null ? `${m.avgRenterPct}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-neutral-600">
                        {m.avgIncome != null ? `$${m.avgIncome.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {m.flaggedCount > 0 ? (
                          <span className="px-2 py-0.5 text-xs font-bold bg-orange-100 text-orange-800 rounded">{m.flaggedCount}</span>
                        ) : (
                          <span className="text-neutral-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Campaign Conversions */}
        <div className="bg-white border-2 border-black p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={20} />
            <h2 className="text-xl font-black">Email Campaign Conversions</h2>
          </div>
          {campaignRows.length === 0 ? (
            <p className="text-neutral-500 text-sm">No campaigns sent yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-neutral-100 border-b-2 border-black">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">Campaign</th>
                  <th className="px-4 py-3 text-left font-bold">Ref Slug</th>
                  <th className="px-4 py-3 text-left font-bold">Sent</th>
                  <th className="px-4 py-3 text-left font-bold">Signups</th>
                  <th className="px-4 py-3 text-left font-bold">Rate</th>
                  <th className="px-4 py-3 text-left font-bold">Date</th>
                </tr>
              </thead>
              <tbody>
                {campaignRows.map((c: any, i: number) => (
                  <tr key={c.id} className={`${i % 2 === 0 ? "bg-white" : "bg-neutral-50"} border-b border-neutral-200`}>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-neutral-500">{c.refSlug || <span className="text-neutral-300">—</span>}</td>
                    <td className="px-4 py-3">{c.sentCount}</td>
                    <td className="px-4 py-3 font-black">{c.conversions}</td>
                    <td className="px-4 py-3">{c.conversionRate != null ? `${c.conversionRate}%` : <span className="text-neutral-300">—</span>}</td>
                    <td className="px-4 py-3 text-neutral-500">{c.sentAt ? new Date(c.sentAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
