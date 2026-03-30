import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/layouts/admin-layout";
import {
  DollarSign, TrendingUp, CreditCard, Users, Search,
  Plus, Trash2, ToggleLeft, ToggleRight, Tag, X, Save,
} from "lucide-react";
import { projectId } from "/utils/supabase/info";
import { toast } from "sonner";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c`;

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token")}` };
}

const STATUS_STYLES: Record<string, string> = {
  paid:        "bg-green-100 text-green-800",
  coupon_free: "bg-blue-100 text-blue-800",
  direct:      "bg-neutral-100 text-neutral-600",
  refunded:    "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  paid:        "PAID",
  coupon_free: "COUPON",
  direct:      "DIRECT",
  refunded:    "REFUNDED",
};

export function AdminPayments() {
  const [tab, setTab] = useState<"payments" | "coupons">("payments");

  // ── Payments state ───────────────────────────────────────────────────────
  const [payments, setPayments] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ── Coupons state ────────────────────────────────────────────────────────
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState<"free" | "percent" | "fixed">("free");
  const [newValue, setNewValue] = useState("");
  const [newMaxUses, setNewMaxUses] = useState("");
  const [newExpires, setNewExpires] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    Promise.allSettled([
      fetch(`${API}/admin/payments`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/settings`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([pd, sd]) => {
      if (pd.status === "fulfilled") setPayments(pd.value.payments ?? []);
      else toast.error("Failed to load payments");
      if (sd.status === "fulfilled") setSettings(sd.value.settings ?? null);
    }).finally(() => setPaymentsLoading(false));

    fetch(`${API}/admin/coupons`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setCoupons(d.coupons ?? []))
      .catch(() => toast.error("Failed to load coupons"))
      .finally(() => setCouponsLoading(false));
  }, []);

  // ── Payment stats ────────────────────────────────────────────────────────
  const totalRevenue = payments.filter(p => p.status === "paid").reduce((acc, p) => acc + (p.finalAmount ?? 0), 0);
  const thisMonthStart = new Date(); thisMonthStart.setDate(1); thisMonthStart.setHours(0,0,0,0);
  const monthRevenue = payments
    .filter(p => p.status === "paid" && new Date(p.createdAt) >= thisMonthStart)
    .reduce((acc, p) => acc + (p.finalAmount ?? 0), 0);
  const paidCount = payments.filter(p => p.status === "paid").length;
  const freeCount = payments.filter(p => p.status === "coupon_free").length;
  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const filteredPayments = payments.filter(p =>
    !search ||
    p.userName?.toLowerCase().includes(search.toLowerCase()) ||
    p.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
    p.couponCode?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Coupon actions ───────────────────────────────────────────────────────
  const createCoupon = async () => {
    if (!newCode.trim()) return toast.error("Code is required");
    if (newType !== "free" && !newValue) return toast.error("Value is required");
    setCreating(true);
    try {
      const res = await fetch(`${API}/admin/coupons`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          code: newCode.trim().toUpperCase(),
          discountType: newType,
          discountValue: newType !== "free" ? Number(newValue) : undefined,
          maxUses: newMaxUses ? Number(newMaxUses) : undefined,
          expiresAt: newExpires ? new Date(newExpires).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to create"); return; }
      toast.success("Coupon created");
      setCoupons(prev => [data.coupon, ...prev]);
      setShowCreate(false);
      setNewCode(""); setNewType("free"); setNewValue(""); setNewMaxUses(""); setNewExpires("");
    } finally {
      setCreating(false);
    }
  };

  const toggleCoupon = async (coupon: any) => {
    const res = await fetch(`${API}/admin/coupons/${coupon.code}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ active: !coupon.active }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Failed to update"); return; }
    setCoupons(prev => prev.map(c => c.code === coupon.code ? data.coupon : c));
  };

  const deleteCoupon = async (code: string) => {
    if (!confirm(`Delete coupon "${code}"?`)) return;
    const res = await fetch(`${API}/admin/coupons/${code}`, { method: "DELETE", headers: authHeaders() });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("Coupon deleted");
    setCoupons(prev => prev.filter(c => c.code !== code));
  };

  const discountLabel = (c: any) => {
    if (c.discountType === "free") return "100% off (Free)";
    if (c.discountType === "percent") return `${c.discountValue}% off`;
    return `$${c.discountValue} off`;
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-4xl font-black mb-8">Payments</h1>

        {/* Tabs */}
        <div className="flex border-b-2 border-black mb-8">
          {(["payments", "coupons"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 font-bold text-sm uppercase tracking-wide transition-colors ${
                tab === t ? "bg-black text-white" : "text-neutral-500 hover:text-black"
              }`}
            >
              {t === "payments" ? "Payments" : `Coupons ${coupons.length > 0 ? `(${coupons.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* ── PAYMENTS TAB ── */}
        {tab === "payments" && (
          paymentsLoading ? (
            <div className="text-center py-12 text-neutral-500">Loading...</div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                  { label: "Total Revenue", value: fmt(totalRevenue), icon: DollarSign },
                  { label: "Revenue This Month", value: fmt(monthRevenue), icon: TrendingUp },
                  { label: "Paid Enrollments", value: String(paidCount), icon: CreditCard },
                  { label: "Free via Coupon", value: String(freeCount), icon: Users },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-white border-2 border-black p-6 text-center">
                    <div className="flex justify-center mb-2">
                      <Icon size={22} />
                    </div>
                    <p className="text-3xl font-black mb-1">{value}</p>
                    <p className="text-sm text-neutral-600">{label}</p>
                  </div>
                ))}
              </div>

              {/* Search */}
              <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="text" placeholder="Search by name, email, or coupon..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-black focus:outline-none"
                />
              </div>

              {/* Table */}
              {filteredPayments.length === 0 ? (
                <div className="text-center py-12 text-neutral-400">
                  {payments.length === 0 ? "No payments yet" : "No results match your search"}
                </div>
              ) : (
                <div className="border-2 border-black overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-black text-white">
                      <tr>
                        <th className="text-left p-4 font-bold text-sm">Student</th>
                        <th className="text-left p-4 font-bold text-sm">Email</th>
                        <th className="text-left p-4 font-bold text-sm">Amount</th>
                        <th className="text-left p-4 font-bold text-sm">Coupon</th>
                        <th className="text-left p-4 font-bold text-sm">Status</th>
                        <th className="text-left p-4 font-bold text-sm">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map((p, i) => (
                        <tr key={p.id} className={`border-b border-neutral-200 hover:bg-neutral-50 ${i % 2 === 0 ? "bg-white" : "bg-neutral-50"}`}>
                          <td className="p-4 font-bold">{p.userName}</td>
                          <td className="p-4 text-neutral-600 text-sm">{p.userEmail}</td>
                          <td className="p-4">
                            <div>
                              <span className="font-black">{fmt(p.finalAmount ?? 0)}</span>
                              {p.discountAmount > 0 && (
                                <span className="text-xs text-neutral-400 ml-2 line-through">{fmt(p.originalAmount)}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-sm">
                            {p.couponCode ? (
                              <span className="flex items-center gap-1 text-blue-700 font-bold">
                                <Tag size={12} /> {p.couponCode}
                              </span>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 text-xs font-bold ${STATUS_STYLES[p.status] ?? "bg-neutral-100 text-neutral-600"}`}>
                              {STATUS_LABELS[p.status] ?? p.status?.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-neutral-600">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )
        )}

        {/* ── COUPONS TAB ── */}
        {tab === "coupons" && (
          <>
            {/* Create coupon form */}
            {showCreate ? (
              <div className="border-2 border-black p-6 mb-6 bg-neutral-50">
                <h3 className="font-black text-lg mb-4">New Coupon</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 uppercase tracking-wide">Code *</label>
                    <input
                      type="text" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                      placeholder="e.g. LAUNCH50" maxLength={20}
                      className="w-full px-3 py-2 border-2 border-black focus:outline-none font-bold tracking-widest uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 uppercase tracking-wide">Discount Type *</label>
                    <select
                      value={newType} onChange={(e) => setNewType(e.target.value as any)}
                      className="w-full px-3 py-2 border-2 border-black focus:outline-none bg-white"
                    >
                      <option value="free">Free access (100% off)</option>
                      <option value="percent">Percentage off</option>
                      <option value="fixed">Fixed amount off ($)</option>
                    </select>
                  </div>
                  {newType !== "free" && (
                    <div>
                      <label className="block text-xs font-bold mb-1 uppercase tracking-wide">
                        {newType === "percent" ? "Percentage (0–100)" : "Amount ($)"}  *
                      </label>
                      <input
                        type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)}
                        min={1} max={newType === "percent" ? 100 : undefined}
                        placeholder={newType === "percent" ? "50" : "100"}
                        className="w-full px-3 py-2 border-2 border-black focus:outline-none"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold mb-1 uppercase tracking-wide">Max Uses (blank = unlimited)</label>
                    <input
                      type="number" value={newMaxUses} onChange={(e) => setNewMaxUses(e.target.value)}
                      min={1} placeholder="e.g. 10"
                      className="w-full px-3 py-2 border-2 border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 uppercase tracking-wide">Expires (blank = never)</label>
                    <input
                      type="date" value={newExpires} onChange={(e) => setNewExpires(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-black focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={createCoupon} disabled={creating} className="flex items-center gap-2 px-6 py-2 bg-black text-white font-bold hover:bg-neutral-800 disabled:opacity-50 transition-colors">
                    <Save size={15} /> {creating ? "Creating..." : "CREATE COUPON"}
                  </button>
                  <button onClick={() => setShowCreate(false)} className="flex items-center gap-2 px-4 py-2 border-2 border-neutral-300 hover:border-black transition-colors">
                    <X size={15} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 mb-6 px-6 py-3 bg-black text-white font-bold hover:bg-neutral-800 transition-colors"
              >
                <Plus size={16} /> CREATE COUPON
              </button>
            )}

            {/* Coupon list */}
            {couponsLoading ? (
              <div className="text-center py-12 text-neutral-500">Loading...</div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-12 text-neutral-400">No coupons yet. Create one above.</div>
            ) : (
              <div className="border-2 border-black overflow-hidden">
                <table className="w-full">
                  <thead className="bg-black text-white">
                    <tr>
                      <th className="text-left p-4 font-bold text-sm">Code</th>
                      <th className="text-left p-4 font-bold text-sm">Discount</th>
                      <th className="text-left p-4 font-bold text-sm">Uses</th>
                      <th className="text-left p-4 font-bold text-sm">Expires</th>
                      <th className="text-left p-4 font-bold text-sm">Status</th>
                      <th className="text-left p-4 font-bold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((c, i) => {
                      const isExpired = c.expiresAt && new Date() > new Date(c.expiresAt);
                      const isMaxed = c.maxUses !== null && c.usedCount >= c.maxUses;
                      return (
                        <tr key={c.code} className={`border-b border-neutral-200 hover:bg-neutral-50 ${i % 2 === 0 ? "bg-white" : "bg-neutral-50"}`}>
                          <td className="p-4 font-black tracking-widest">{c.code}</td>
                          <td className="p-4 text-sm font-semibold">{discountLabel(c)}</td>
                          <td className="p-4 text-sm">
                            <span className={isMaxed ? "text-red-600 font-bold" : ""}>
                              {c.usedCount}{c.maxUses !== null ? `/${c.maxUses}` : ""}
                            </span>
                          </td>
                          <td className="p-4 text-sm">
                            {c.expiresAt ? (
                              <span className={isExpired ? "text-red-500 font-bold" : "text-neutral-600"}>
                                {new Date(c.expiresAt).toLocaleDateString()}
                                {isExpired && " (expired)"}
                              </span>
                            ) : (
                              <span className="text-neutral-400">Never</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 text-xs font-bold ${
                              !c.active || isExpired || isMaxed
                                ? "bg-neutral-100 text-neutral-400"
                                : "bg-green-100 text-green-800"
                            }`}>
                              {!c.active ? "DISABLED" : isExpired ? "EXPIRED" : isMaxed ? "MAXED" : "ACTIVE"}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button onClick={() => toggleCoupon(c)} title={c.active ? "Disable" : "Enable"} className="text-neutral-400 hover:text-black transition-colors">
                                {c.active ? <ToggleRight size={20} className="text-black" /> : <ToggleLeft size={20} />}
                              </button>
                              <button onClick={() => deleteCoupon(c.code)} className="text-neutral-300 hover:text-red-600 transition-colors">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
