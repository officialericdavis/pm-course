import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "../../components/layouts/admin-layout";
import { projectId } from "/utils/supabase/info";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Database, Upload, Globe, RefreshCw, CheckCircle, AlertCircle, Loader2, GitMerge, Trash2 } from "lucide-react";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c`;

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("access_token")}`, "Content-Type": "application/json" };
}

const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];

const SOURCE_LABELS: Record<string, string> = {
  osm: "OpenStreetMap",
  csv: "CSV Upload",
  student: "Student Reports",
};

export function AdminDatabase() {
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [deduping, setDeduping] = useState(false);
  const [dedupResult, setDedupResult] = useState<{ merged: number; deleted: number; indexed: number; total: number } | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<{ deleted: number; total: number } | null>(null);

  // OSM import state
  const [selectedState, setSelectedState] = useState("");
  const [osmImporting, setOsmImporting] = useState(false);
  const [osmResult, setOsmResult] = useState<{ imported: number; skipped: number; total: number } | null>(null);

  // CSV import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<{ imported: number; skipped: number; total: number } | null>(null);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    setStatsLoading(true);
    try {
      const r = await fetch(`${API}/admin/laundromat-db/stats`, { headers: authHeaders() });
      if (r.ok) setStats(await r.json());
    } catch { /* silent */ }
    finally { setStatsLoading(false); }
  }

  async function handleCleanup() {
    if (!window.confirm("Delete all entries with no address? This cannot be undone.")) return;
    setCleaning(true);
    setCleanResult(null);
    try {
      const r = await fetch(`${API}/admin/laundromat-db/cleanup-no-address`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await r.json();
      if (!r.ok) { toast.error(data.error || "Cleanup failed"); return; }
      setCleanResult(data);
      toast.success(`Removed ${data.deleted} entries with no address`);
      loadStats();
    } catch { toast.error("Cleanup failed"); }
    finally { setCleaning(false); }
  }

  async function handleDeduplicate() {
    setDeduping(true);
    setDedupResult(null);
    try {
      const r = await fetch(`${API}/admin/laundromat-db/deduplicate`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await r.json();
      if (!r.ok) { toast.error(data.error || "Deduplication failed"); return; }
      setDedupResult(data);
      toast.success(`Deduplication complete — ${data.deleted} duplicates removed`);
      loadStats();
    } catch { toast.error("Deduplication failed"); }
    finally { setDeduping(false); }
  }

  async function handleOsmImport() {
    if (!selectedState) { toast.error("Select a state first"); return; }
    setOsmImporting(true);
    setOsmResult(null);
    try {
      const r = await fetch(`${API}/admin/laundromat-db/import-osm`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ stateCode: selectedState }),
      });
      const data = await r.json();
      if (!r.ok) { toast.error(data.error || "Import failed"); return; }
      setOsmResult(data);
      toast.success(`Imported ${data.imported} new laundromats from OpenStreetMap`);
      loadStats();
    } catch { toast.error("Import failed"); }
    finally { setOsmImporting(false); }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvResult(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (rows.length === 0) { toast.error("No data found in file"); return; }
        const cols = Object.keys(rows[0]);
        setCsvColumns(cols);
        setCsvRows(rows);
        // Auto-map common column names
        const auto: Record<string, string> = {};
        const find = (keys: string[]) => cols.find(c => keys.some(k => c.toLowerCase().includes(k))) ?? "";
        auto.name    = find(["name", "business", "dba", "store"]);
        auto.address = find(["address", "street", "addr"]);
        auto.city    = find(["city", "town"]);
        auto.state   = find(["state", "st", "province"]);
        auto.zip     = find(["zip", "postal", "postcode"]);
        auto.lat     = find(["lat", "latitude"]);
        auto.lon     = find(["lon", "lng", "longitude"]);
        setCsvMapping(auto);
      } catch { toast.error("Could not parse file"); }
    };
    reader.readAsBinaryString(file);
  }

  async function handleCsvImport() {
    if (csvRows.length === 0) { toast.error("Upload a file first"); return; }
    if (!csvMapping.address) { toast.error("Map the Address column first"); return; }
    setCsvImporting(true);
    setCsvResult(null);
    try {
      const records = csvRows.map(row => ({
        name:    csvMapping.name    ? row[csvMapping.name]    : null,
        address: csvMapping.address ? row[csvMapping.address] : null,
        city:    csvMapping.city    ? row[csvMapping.city]    : null,
        state:   csvMapping.state   ? row[csvMapping.state]   : null,
        zip:     csvMapping.zip     ? row[csvMapping.zip]     : null,
        lat:     csvMapping.lat     ? row[csvMapping.lat]     : null,
        lon:     csvMapping.lon     ? row[csvMapping.lon]     : null,
      }));
      const r = await fetch(`${API}/admin/laundromat-db/import-csv`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ records }),
      });
      const data = await r.json();
      if (!r.ok) { toast.error(data.error || "Import failed"); return; }
      setCsvResult(data);
      toast.success(`Imported ${data.imported} new laundromats from CSV`);
      loadStats();
    } catch { toast.error("Import failed"); }
    finally { setCsvImporting(false); }
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Database size={32} />
            <h1 className="text-4xl font-black">Laundromat Database</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadStats} className="flex items-center gap-2 border-2 border-black px-4 py-2 font-bold text-sm hover:bg-black hover:text-white transition-colors">
              <RefreshCw size={16} />
              Refresh Stats
            </button>
            <button
              onClick={handleCleanup}
              disabled={cleaning}
              className="flex items-center gap-2 border-2 border-red-600 text-red-600 px-4 py-2 font-bold text-sm hover:bg-red-600 hover:text-white transition-colors disabled:opacity-40"
            >
              {cleaning ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {cleaning ? "Cleaning..." : "Remove No-Address"}
            </button>
            <button
              onClick={handleDeduplicate}
              disabled={deduping}
              className="flex items-center gap-2 border-2 border-black px-4 py-2 font-bold text-sm hover:bg-black hover:text-white transition-colors disabled:opacity-40"
            >
              {deduping ? <Loader2 size={16} className="animate-spin" /> : <GitMerge size={16} />}
              {deduping ? "Deduplicating..." : "Deduplicate DB"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border-2 border-black p-6 text-center">
            <p className="text-5xl font-black mb-1">
              {statsLoading ? "—" : (stats?.total ?? 0).toLocaleString()}
            </p>
            <p className="text-sm text-neutral-500 font-bold uppercase tracking-wide">Total in DB</p>
          </div>
          <div className="bg-white border-2 border-green-500 p-6 text-center">
            <p className="text-5xl font-black mb-1 text-green-700">
              {statsLoading ? "—" : (stats?.complete ?? 0).toLocaleString()}
            </p>
            <p className="text-sm text-green-700 font-bold uppercase tracking-wide">Fully Complete</p>
            <p className="text-xs text-neutral-400 mt-1">name · address · city · state · zip</p>
          </div>
          <div className="bg-white border-2 border-orange-400 p-6 text-center">
            <p className="text-5xl font-black mb-1 text-orange-600">
              {statsLoading ? "—" : (stats?.incomplete ?? 0).toLocaleString()}
            </p>
            <p className="text-sm text-orange-600 font-bold uppercase tracking-wide">Incomplete</p>
            <p className="text-xs text-neutral-400 mt-1">missing one or more fields</p>
          </div>
          <div className="bg-white border-2 border-black p-6 col-span-1">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-3">By Source</p>
            {statsLoading ? (
              <p className="text-neutral-400 text-sm">Loading...</p>
            ) : (
              <div className="flex flex-col gap-2">
                {Object.entries(stats?.bySource ?? {}).map(([src, count]) => (
                  <div key={src} className="flex justify-between items-center">
                    <p className="text-xs text-neutral-500">{SOURCE_LABELS[src] ?? src}</p>
                    <p className="text-sm font-black">{(count as number).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cleanup Result */}
        {cleanResult && (
          <div className="bg-white border-2 border-red-400 p-4 mb-6 flex items-center gap-6">
            <div className="flex items-center gap-2 font-black text-red-700">
              <Trash2 size={18} /> Cleanup complete
            </div>
            <div className="flex gap-6 text-sm">
              <span><strong>{cleanResult.deleted.toLocaleString()}</strong> no-address entries removed</span>
              <span className="text-neutral-400">{cleanResult.total.toLocaleString()} total scanned</span>
            </div>
          </div>
        )}

        {/* Dedup Result */}
        {dedupResult && (
          <div className="bg-white border-2 border-black p-4 mb-6 flex items-center gap-6">
            <div className="flex items-center gap-2 font-black text-green-700">
              <CheckCircle size={18} /> Deduplication complete
            </div>
            <div className="flex gap-6 text-sm">
              <span><strong>{dedupResult.deleted.toLocaleString()}</strong> duplicates removed</span>
              <span><strong>{dedupResult.merged.toLocaleString()}</strong> groups merged</span>
              <span><strong>{dedupResult.indexed.toLocaleString()}</strong> entries indexed</span>
              <span className="text-neutral-400">{dedupResult.total.toLocaleString()} total processed</span>
            </div>
          </div>
        )}

        {/* Top States */}
        {!statsLoading && stats?.topStates?.length > 0 && (
          <div className="bg-white border-2 border-black p-6 mb-8">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-4">Top States in Database</p>
            <div className="flex flex-wrap gap-3">
              {stats.topStates.map((s: any) => (
                <div key={s.state} className="flex items-center gap-2 bg-neutral-100 px-3 py-2 border border-neutral-300">
                  <span className="font-black text-sm">{s.state}</span>
                  <span className="text-xs text-neutral-500">{s.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* OSM Import */}
          <div className="bg-white border-2 border-black p-6">
            <div className="flex items-center gap-2 mb-1">
              <Globe size={20} />
              <h2 className="text-xl font-black">Import from OpenStreetMap</h2>
            </div>
            <p className="text-sm text-neutral-500 mb-6">Free, global database. Pulls all laundromats tagged in OSM for a US state. Run each state once — duplicates are skipped automatically.</p>

            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">Select State</label>
              <select
                value={selectedState}
                onChange={e => { setSelectedState(e.target.value); setOsmResult(null); }}
                className="w-full px-4 py-3 border-2 border-black focus:outline-none"
              >
                <option value="">— Choose a state —</option>
                {US_STATES.map(s => (
                  <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleOsmImport}
              disabled={osmImporting || !selectedState}
              className="w-full bg-black text-white px-6 py-3 font-bold hover:bg-neutral-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 mb-4"
            >
              {osmImporting
                ? <><Loader2 size={18} className="animate-spin" /> Importing from OSM...</>
                : <><Globe size={18} /> Import {selectedState ? US_STATES.find(s => s.code === selectedState)?.name : "State"}</>
              }
            </button>

            {osmImporting && (
              <p className="text-xs text-neutral-500 text-center">This can take up to 60 seconds for large states...</p>
            )}

            {osmResult && (
              <div className="bg-neutral-50 border border-neutral-200 p-4">
                <div className="flex items-center gap-2 text-green-700 font-bold mb-2">
                  <CheckCircle size={16} /> Import complete
                </div>
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div><p className="font-black text-lg">{osmResult.total}</p><p className="text-neutral-500">Found in OSM</p></div>
                  <div><p className="font-black text-lg text-green-600">{osmResult.imported}</p><p className="text-neutral-500">Imported</p></div>
                  <div><p className="font-black text-lg text-neutral-400">{osmResult.skipped}</p><p className="text-neutral-500">Already existed</p></div>
                </div>
              </div>
            )}

            <div className="mt-4 border-t pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-400 mb-2">Other free sources to explore</p>
              <ul className="text-xs text-neutral-500 space-y-1">
                <li>• <strong>Overpass Turbo</strong> (overpass-turbo.eu) — export custom OSM queries as CSV</li>
                <li>• <strong>Yelp Open Dataset</strong> — academic use, business listings</li>
                <li>• <strong>SafeGraph via Dewey</strong> (deweydata.io) — POI data, partial free tier</li>
                <li>• <strong>InfoUSA / DataAxle</strong> — paid business lists by NAICS code 812310</li>
              </ul>
            </div>
          </div>

          {/* CSV Upload */}
          <div className="bg-white border-2 border-black p-6">
            <div className="flex items-center gap-2 mb-1">
              <Upload size={20} />
              <h2 className="text-xl font-black">Import from CSV / Excel</h2>
            </div>
            <p className="text-sm text-neutral-500 mb-6">Upload any spreadsheet of laundromat locations. Map the columns, then import. Supports .csv, .xlsx, .xls.</p>

            <div
              className="border-2 border-dashed border-black p-8 text-center cursor-pointer hover:bg-neutral-50 transition-colors mb-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} className="mx-auto mb-2 text-neutral-400" />
              <p className="font-bold text-sm">Click to upload file</p>
              <p className="text-xs text-neutral-500 mt-1">.csv, .xlsx, .xls — up to 10,000 rows</p>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
            </div>

            {csvRows.length > 0 && (
              <>
                <div className="bg-neutral-50 border border-neutral-200 p-3 mb-4">
                  <p className="text-xs font-bold text-neutral-500 mb-1">{csvRows.length.toLocaleString()} rows loaded</p>
                  <p className="text-xs text-neutral-400">Preview: {Object.values(csvRows[0]).slice(0, 3).join(" | ")}...</p>
                </div>

                <p className="text-sm font-bold mb-3">Map Columns</p>
                <div className="space-y-2 mb-4">
                  {(["name", "address", "city", "state", "zip", "lat", "lon"] as const).map(field => (
                    <div key={field} className="grid grid-cols-2 gap-2 items-center">
                      <label className="text-xs font-bold uppercase text-neutral-600">
                        {field}{field === "address" ? " *" : ""}
                      </label>
                      <select
                        value={csvMapping[field] ?? ""}
                        onChange={e => setCsvMapping(m => ({ ...m, [field]: e.target.value }))}
                        className="w-full px-2 py-1.5 border-2 border-black text-xs focus:outline-none"
                      >
                        <option value="">— skip —</option>
                        {csvColumns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {!csvMapping.address && (
                  <div className="flex items-center gap-2 text-xs text-red-600 mb-3">
                    <AlertCircle size={13} /> Address column is required
                  </div>
                )}

                <button
                  onClick={handleCsvImport}
                  disabled={csvImporting || !csvMapping.address}
                  className="w-full bg-black text-white px-6 py-3 font-bold hover:bg-neutral-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {csvImporting
                    ? <><Loader2 size={18} className="animate-spin" /> Importing...</>
                    : <><Upload size={18} /> Import {csvRows.length.toLocaleString()} Records</>
                  }
                </button>
              </>
            )}

            {csvResult && (
              <div className="bg-neutral-50 border border-neutral-200 p-4 mt-4">
                <div className="flex items-center gap-2 text-green-700 font-bold mb-2">
                  <CheckCircle size={16} /> Import complete
                </div>
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div><p className="font-black text-lg">{csvResult.total}</p><p className="text-neutral-500">Total rows</p></div>
                  <div><p className="font-black text-lg text-green-600">{csvResult.imported}</p><p className="text-neutral-500">Imported</p></div>
                  <div><p className="font-black text-lg text-neutral-400">{csvResult.skipped}</p><p className="text-neutral-500">Skipped</p></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
