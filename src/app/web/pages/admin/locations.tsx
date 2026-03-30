import { useState, useEffect, useRef, useCallback } from "react";
import { AdminLayout } from "../../components/layouts/admin-layout";
import {
  Search, WashingMachine, Users, Globe, Upload, UserCheck,
  Filter, Pencil, Check, X, ChevronLeft, ChevronRight,
  AlertTriangle, Sparkles, Loader2, ChevronDown,
} from "lucide-react";
import { projectId } from "/utils/supabase/info";
import { toast } from "sonner";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c`;
const PAGE_SIZE = 25;

const ALL_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const STATUS_COLORS: Record<string, string> = {
  acquired: "bg-green-100 text-green-800",
  interested: "bg-blue-100 text-blue-800",
  researching: "bg-yellow-100 text-yellow-800",
  rejected: "bg-red-100 text-red-800",
};

const SOURCE_BADGE: Record<string, { label: string; className: string; Icon: any }> = {
  osm:     { label: "OpenStreetMap",  className: "bg-blue-100 text-blue-800",    Icon: Globe },
  csv:     { label: "CSV Import",     className: "bg-purple-100 text-purple-800", Icon: Upload },
  student: { label: "Student Report", className: "bg-orange-100 text-orange-800", Icon: UserCheck },
};

function missingFields(entry: any): string[] {
  const missing: string[] = [];
  if (!entry.note?.trim())    missing.push("note");
  if (!entry.address?.trim()) missing.push("address");
  if (!entry.city?.trim())    missing.push("city");
  if (!entry.state?.trim())   missing.push("state");
  if (!entry.zip?.trim())     missing.push("zip");
  return missing;
}

function isFlagged(entry: any) {
  return missingFields(entry).length > 0;
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("access_token")}` };
}

// ── Inline editable cell ──────────────────────────────────────────────────────
function EditableCell({
  value, entryId, field, onSaved, className = "",
}: {
  value: string; entryId: string; field: "note" | "address" | "city" | "state" | "zip";
  onSaved: (id: string, field: string, newVal: string) => void; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() { setDraft(value); setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }
  function cancel() { setDraft(value); setEditing(false); }

  async function save() {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    try {
      const r = await fetch(`${API}/admin/laundromat-db/${encodeURIComponent(entryId)}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: draft }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || "Save failed"); }
      onSaved(entryId, field, draft);
      setEditing(false);
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  if (editing) {
    return (
      <td className="p-2">
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
            className={`border-2 border-black px-2 py-1 text-sm focus:outline-none w-full min-w-[120px] ${className}`}
            disabled={saving}
          />
          <button onClick={save} disabled={saving} className="p-1 hover:text-green-700 text-neutral-600 shrink-0"><Check size={15} /></button>
          <button onClick={cancel} disabled={saving} className="p-1 hover:text-red-600 text-neutral-400 shrink-0"><X size={15} /></button>
        </div>
      </td>
    );
  }

  return (
    <td className={`p-4 group ${className}`}>
      <div className="flex items-center gap-2">
        <span className="flex-1">{value || "—"}</span>
        <button onClick={startEdit} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-neutral-400 hover:text-black shrink-0" title="Edit">
          <Pencil size={13} />
        </button>
      </div>
    </td>
  );
}

// ── Pagination bar ────────────────────────────────────────────────────────────
function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to   = Math.min(total, (page + 1) * pageSize);

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pages.push(i);
  } else {
    pages.push(0);
    if (page > 3) pages.push("…");
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages - 2, page + 2); i++) pages.push(i);
    if (page < totalPages - 4) pages.push("…");
    pages.push(totalPages - 1);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t-2 border-black bg-white">
      <span className="text-sm text-neutral-500 font-bold">{from}–{to} of {total.toLocaleString()}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 0} className="p-1.5 border-2 border-black disabled:opacity-30 hover:bg-black hover:text-white transition-colors">
          <ChevronLeft size={16} />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="px-2 text-neutral-400">…</span>
          ) : (
            <button key={p} onClick={() => onChange(p as number)}
              className={`w-9 h-9 text-sm font-bold border-2 transition-colors ${p === page ? "bg-black text-white border-black" : "border-black hover:bg-neutral-100"}`}>
              {(p as number) + 1}
            </button>
          )
        )}
        <button onClick={() => onChange(page + 1)} disabled={page >= totalPages - 1} className="p-1.5 border-2 border-black disabled:opacity-30 hover:bg-black hover:text-white transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function AdminLocations() {
  const [tab, setTab] = useState<"students" | "database">("students");

  const [locations, setLocations] = useState<any[]>([]);
  const [locLoading, setLocLoading] = useState(true);
  const [locPage, setLocPage] = useState(0);

  const [dbEntries, setDbEntries] = useState<any[]>([]);
  const [dbTotal, setDbTotal] = useState(0);
  const [dbPage, setDbPage] = useState(0);
  const [dbLoading, setDbLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [dbSearch, setDbSearch] = useState("");
  const [dbFilterState, setDbFilterState] = useState("");
  const [dbFilterSource, setDbFilterSource] = useState("");
  const [dbFlaggedOnly, setDbFlaggedOnly] = useState(false);

  const [dbSources, setDbSources] = useState<string[]>([]);

  // Per-row enrich loading state
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());

  // Ref holds current search so page/filter effects can read it without being deps
  const dbSearchRef = useRef("");
  const dbSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dbSourcesLoaded = useRef(false);

  useEffect(() => {
    fetch(`${API}/admin/all-locations`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => { setLocations(data.locations ?? []); setLocLoading(false); })
      .catch(() => { toast.error("Failed to load locations"); setLocLoading(false); });
  }, []);

  const loadDbPage = useCallback((page: number, flaggedOnly: boolean, search = "", state = "", source = "") => {
    setDbLoading(true);
    const params = new URLSearchParams({
      offset: String(page * PAGE_SIZE),
      limit: String(PAGE_SIZE),
      ...(flaggedOnly ? { flagged: "1" } : {}),
      ...(search  ? { search }  : {}),
      ...(state   ? { state }   : {}),
      ...(source  ? { source }  : {}),
    });
    fetch(`${API}/admin/laundromat-db/list?${params}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        setDbEntries(data.entries ?? []);
        setDbTotal(data.total ?? 0);
        setDbLoading(false);
      })
      .catch(() => { toast.error("Failed to load database"); setDbLoading(false); });
  }, []);

  // Page / filter changes (not search — search is debounced separately via dbSearchRef)
  useEffect(() => {
    if (tab === "database") loadDbPage(dbPage, dbFlaggedOnly, dbSearchRef.current, dbFilterState, dbFilterSource);
  }, [tab, dbPage, dbFlaggedOnly, dbFilterState, dbFilterSource, loadDbPage]);

  // Load sources once when entering database tab
  useEffect(() => {
    if (tab === "database" && !dbSourcesLoaded.current) {
      dbSourcesLoaded.current = true;
      fetch(`${API}/admin/laundromat-db/stats`, { headers: authHeaders() })
        .then(r => r.json())
        .then(data => { if (data.bySource) setDbSources(Object.keys(data.bySource).sort()); })
        .catch(() => {});
    }
  }, [tab]);

  function handleFieldSaved(id: string, field: string, value: string) {
    setDbEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  }

  async function handleEnrich(entryId: string) {
    setEnrichingIds(prev => new Set(prev).add(entryId));
    try {
      const r = await fetch(`${API}/admin/laundromat-db/enrich/${encodeURIComponent(entryId)}`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await r.json();
      if (!r.ok) {
        if (r.status === 400 && data.error?.includes("API key")) {
          toast.error("Google Maps API key not set. Add GOOGLE_MAPS_API_KEY to Supabase Edge Function secrets.");
        } else {
          toast.error(data.error || "Enrichment failed");
        }
        return;
      }
      if (!data.found) {
        toast.info("No additional data found via Google Maps for this entry.");
        return;
      }
      // Update local row with enriched data
      setDbEntries(prev => prev.map(e => e.id === entryId ? data.entry : e));
      toast.success(`Auto-filled: ${Object.keys(data.updates).join(", ")}`);
    } catch {
      toast.error("Enrichment request failed");
    } finally {
      setEnrichingIds(prev => { const s = new Set(prev); s.delete(entryId); return s; });
    }
  }

  function handleDbPageChange(page: number) {
    setDbPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const getScoreColor = (score: number) =>
    score >= 8 ? "text-green-600" : score >= 6 ? "text-yellow-600" : "text-red-600";

  const filteredLocations = locations.filter(l =>
    !searchTerm ||
    l.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.userName?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const pagedLocations = filteredLocations.slice(locPage * PAGE_SIZE, (locPage + 1) * PAGE_SIZE);

  // DB entries come pre-filtered from the server; use directly
  const filteredDb = dbEntries;

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-black">Locations</h1>
          <div className="text-neutral-500 font-bold">
            {tab === "students"
              ? `${locations.length.toLocaleString()} student locations`
              : `${dbTotal.toLocaleString()} ${dbFlaggedOnly ? "flagged" : "total"} entries`}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-black mb-6">
          <button
            onClick={() => { setTab("students"); setSearchTerm(""); setLocPage(0); }}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-colors ${tab === "students" ? "bg-black text-white" : "text-neutral-500 hover:text-black"}`}
          >
            <Users size={16} /> Student Locations
          </button>
          <button
            onClick={() => { setTab("database"); setSearchTerm(""); setDbPage(0); }}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-colors ${tab === "database" ? "bg-black text-white" : "text-neutral-500 hover:text-black"}`}
          >
            <WashingMachine size={16} /> Laundromat Database
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <input
              type="text"
              placeholder={tab === "students" ? "Search by address, city, or student..." : "Search by name, address, city, state, or zip..."}
              value={tab === "database" ? dbSearch : searchTerm}
              onChange={e => {
                if (tab === "database") {
                  const val = e.target.value;
                  dbSearchRef.current = val;
                  setDbSearch(val);
                  if (dbSearchDebounce.current) clearTimeout(dbSearchDebounce.current);
                  dbSearchDebounce.current = setTimeout(() => {
                    setDbPage(0);
                    loadDbPage(0, dbFlaggedOnly, val, dbFilterState, dbFilterSource);
                  }, 350);
                } else {
                  setSearchTerm(e.target.value);
                  setLocPage(0);
                }
              }}
              className="w-full pl-10 pr-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        {/* DB Filters */}
        {tab === "database" && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Filter size={15} className="text-neutral-400 shrink-0" />

            {/* State dropdown */}
            <div className="relative">
              <select
                value={dbFilterState}
                onChange={e => { setDbFilterState(e.target.value); setDbPage(0); }}
                className="appearance-none pl-3 pr-8 py-2 border-2 border-black text-sm font-bold bg-white focus:outline-none cursor-pointer"
              >
                <option value="">All States</option>
                {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black" />
            </div>

            {/* Source dropdown */}
            <div className="relative">
              <select
                value={dbFilterSource}
                onChange={e => { setDbFilterSource(e.target.value); setDbPage(0); }}
                className="appearance-none pl-3 pr-8 py-2 border-2 border-black text-sm font-bold bg-white focus:outline-none cursor-pointer"
              >
                <option value="">All Sources</option>
                {dbSources.map(s => <option key={s} value={s}>{SOURCE_BADGE[s]?.label ?? s}</option>)}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black" />
            </div>

            {/* Flagged toggle */}
            <button
              onClick={() => { setDbFlaggedOnly(v => !v); setDbPage(0); }}
              className={`flex items-center gap-2 px-3 py-2 border-2 font-bold text-sm transition-colors ${
                dbFlaggedOnly
                  ? "bg-orange-500 text-white border-orange-500"
                  : "border-black text-black hover:bg-neutral-100"
              }`}
            >
              <AlertTriangle size={13} />
              Missing data only
            </button>

            {(dbFilterState || dbFilterSource || dbFlaggedOnly || dbSearch) && (
              <button
                onClick={() => { dbSearchRef.current = ""; setDbSearch(""); setDbFilterState(""); setDbFilterSource(""); setDbFlaggedOnly(false); setDbPage(0); }}
                className="flex items-center gap-1 px-2 py-2 text-xs font-bold text-neutral-500 hover:text-black border-2 border-transparent hover:border-neutral-300 transition-colors"
              >
                <X size={12} /> Clear
              </button>
            )}

            <span className="ml-auto text-sm font-bold text-neutral-500">
              {dbTotal.toLocaleString()} {dbFlaggedOnly ? "flagged" : "total"}
            </span>
          </div>
        )}

        {/* ── Student Locations Tab ── */}
        {tab === "students" && (
          locLoading ? (
            <div className="text-center py-12 text-neutral-500">Loading locations...</div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              {locations.length === 0 ? "No locations submitted yet" : "No locations match your search"}
            </div>
          ) : (
            <div className="bg-white border-2 border-black overflow-hidden">
              <table className="w-full">
                <thead className="bg-black text-white">
                  <tr>
                    <th className="text-left p-4 font-bold">Address</th>
                    <th className="text-left p-4 font-bold">City / State</th>
                    <th className="text-left p-4 font-bold">Submitted By</th>
                    <th className="text-left p-4 font-bold">Score</th>
                    <th className="text-left p-4 font-bold">Status</th>
                    <th className="text-left p-4 font-bold">Source</th>
                    <th className="text-left p-4 font-bold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedLocations.map((location, index) => (
                    <tr key={location.id} className={`border-b border-neutral-200 hover:bg-neutral-50 ${index % 2 === 0 ? "bg-white" : "bg-neutral-50"}`}>
                      <td className="p-4 font-bold">{location.address}</td>
                      <td className="p-4 text-neutral-600">{location.city}, {location.state}</td>
                      <td className="p-4 text-neutral-600">{location.userName}</td>
                      <td className="p-4">
                        <span className={`text-xl font-black ${getScoreColor(location.dealScore)}`}>{location.dealScore}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 text-xs font-bold ${STATUS_COLORS[location.status] ?? "bg-neutral-100 text-neutral-800"}`}>
                          {location.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-neutral-100 text-neutral-700 w-fit">
                          <Users size={11} /> Student
                        </span>
                      </td>
                      <td className="p-4 text-neutral-600">{new Date(location.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLocations.length > PAGE_SIZE && (
                <Pagination page={locPage} total={filteredLocations.length} pageSize={PAGE_SIZE}
                  onChange={p => { setLocPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
              )}
            </div>
          )
        )}

        {/* ── Laundromat Database Tab ── */}
        {tab === "database" && (
          dbLoading ? (
            <div className="text-center py-12 text-neutral-500">Loading...</div>
          ) : dbTotal === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              {dbFlaggedOnly ? "No flagged entries — all records have name and address." : "No entries yet — run an OSM import or upload a CSV from the Laundromat DB page"}
            </div>
          ) : (
            <div className="bg-white border-2 border-black overflow-hidden">
              <p className="text-xs text-neutral-400 px-4 pt-3 pb-1">
                Hover a cell to edit inline. <span className="text-orange-500 font-bold">⚠ orange rows</span> are missing name or address — click <Sparkles size={11} className="inline" /> to auto-fill via Google Maps.
              </p>
              <table className="w-full">
                <thead className="bg-black text-white">
                  <tr>
                    <th className="text-left p-4 font-bold w-8"></th>
                    <th className="text-left p-4 font-bold">Name</th>
                    <th className="text-left p-4 font-bold">Address</th>
                    <th className="text-left p-4 font-bold">City</th>
                    <th className="text-left p-4 font-bold">State</th>
                    <th className="text-left p-4 font-bold">ZIP</th>
                    <th className="text-left p-4 font-bold">Source</th>
                    <th className="text-left p-4 font-bold">Date Added</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDb.map((entry, index) => {
                    const missing = missingFields(entry);
                    const flagged = missing.length > 0;
                    const badge = SOURCE_BADGE[entry.source ?? "student"];
                    const BadgeIcon = badge?.Icon ?? UserCheck;
                    const enriching = enrichingIds.has(entry.id);
                    const rowBg = flagged
                      ? "bg-orange-50"
                      : (index % 2 === 0 ? "bg-white" : "bg-neutral-50");
                    const missingCls = "text-orange-400 italic";
                    return (
                      <tr key={entry.id} className={`border-b border-neutral-200 hover:brightness-95 transition-all ${rowBg}`}>
                        {/* Flag / Auto-fill cell */}
                        <td className="p-3 text-center">
                          {flagged && (
                            <button
                              onClick={() => handleEnrich(entry.id)}
                              disabled={enriching}
                              title={`Missing: ${missing.join(", ")}`}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-orange-600 hover:bg-orange-100 border border-orange-300 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {enriching
                                ? <Loader2 size={12} className="animate-spin" />
                                : <Sparkles size={12} />
                              }
                            </button>
                          )}
                        </td>
                        <EditableCell value={entry.note ?? ""} entryId={entry.id} field="note" onSaved={handleFieldSaved}
                          className={`font-bold text-sm ${missing.includes("note") ? missingCls : ""}`} />
                        <EditableCell value={entry.address ?? ""} entryId={entry.id} field="address" onSaved={handleFieldSaved}
                          className={`text-sm ${missing.includes("address") ? missingCls : "text-neutral-700"}`} />
                        <EditableCell value={entry.city ?? ""} entryId={entry.id} field="city" onSaved={handleFieldSaved}
                          className={`text-neutral-600 ${missing.includes("city") ? missingCls : ""}`} />
                        <EditableCell value={entry.state ?? ""} entryId={entry.id} field="state" onSaved={handleFieldSaved}
                          className={`text-neutral-600 font-bold ${missing.includes("state") ? missingCls : ""}`} />
                        <EditableCell value={entry.zip ?? ""} entryId={entry.id} field="zip" onSaved={handleFieldSaved}
                          className={`text-neutral-600 ${missing.includes("zip") ? missingCls : ""}`} />
                        <td className="p-4">
                          <span className={`flex items-center gap-1 px-2 py-1 text-xs font-bold w-fit ${badge?.className ?? "bg-neutral-100 text-neutral-700"}`}>
                            <BadgeIcon size={11} />
                            {badge?.label ?? entry.source}
                          </span>
                        </td>
                        <td className="p-4 text-neutral-600 text-sm">
                          {entry.reportedAt ? new Date(entry.reportedAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Pagination page={dbPage} total={dbTotal} pageSize={PAGE_SIZE} onChange={handleDbPageChange} />
            </div>
          )
        )}
      </div>
    </AdminLayout>
  );
}
