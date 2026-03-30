import { useState, useEffect, useRef, useCallback } from "react";
import { AdminLayout } from "../../components/layouts/admin-layout";
import { MapPin, Star, WashingMachine, Globe, Upload, UserCheck, Eye, EyeOff, ChevronDown, Loader2, AlertTriangle } from "lucide-react";
import { projectId } from "/utils/supabase/info";
import { Loader } from "@googlemaps/js-api-loader";
import { toast } from "sonner";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c`;
const MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ?? "";

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

// Marker colors per source/type
const MARKER_COLORS: Record<string, string> = {
  student: "#f97316", // orange
  osm:     "#3b82f6", // blue
  csv:     "#a855f7", // purple
};

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("access_token")}` };
}

export function AdminMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");

  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [selectedType, setSelectedType] = useState<"student" | "db">("student");
  const [filterState, setFilterState] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [showDb, setShowDb] = useState(false);
  const [dbEntries, setDbEntries] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);

  // ── Load student locations ─────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/admin/all-locations`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => { setLocations(data.locations ?? []); setLoading(false); })
      .catch(() => { toast.error("Failed to load locations"); setLoading(false); });
  }, []);

  // ── Load DB entries (all pages) ────────────────────────────────────────────
  useEffect(() => {
    if (showDb && !dbLoaded) {
      setDbLoading(true);
      const fetchAll = async () => {
        const all: any[] = [];
        const limit = 1000;
        let offset = 0;
        while (true) {
          const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
          const r = await fetch(`${API}/admin/laundromat-db/list?${params}`, { headers: authHeaders() });
          const data = await r.json();
          const entries = data.entries ?? [];
          all.push(...entries);
          if (entries.length < limit) break;
          offset += limit;
        }
        return all;
      };
      fetchAll()
        .then(all => { setDbEntries(all); setDbLoading(false); setDbLoaded(true); })
        .catch(() => { toast.error("Failed to load database"); setDbLoading(false); });
    }
  }, [showDb, dbLoaded]);

  // ── Init Google Map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!MAPS_KEY) { setMapError("Add VITE_GOOGLE_MAPS_API_KEY to your .env file to enable the map."); return; }
    const loader = new Loader({ apiKey: MAPS_KEY, version: "weekly", libraries: ["marker"] });
    loader.load().then(async () => {
      if (!mapRef.current) return;
      const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
      const { InfoWindow } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
      googleMapRef.current = new Map(mapRef.current, {
        center: { lat: 39.5, lng: -98.35 },
        zoom: 4,
        mapId: "laundromat_map",
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      infoWindowRef.current = new InfoWindow();
      setMapReady(true);
    }).catch(() => setMapError("Failed to load Google Maps. Check your API key."));
  }, []);

  // ── Plot markers whenever data or filters change ───────────────────────────
  const plotMarkers = useCallback(async () => {
    if (!googleMapRef.current || !mapReady) return;
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

    // Clear existing markers
    markersRef.current.forEach(m => { m.map = null; });
    markersRef.current = [];

    const addMarker = (lat: number, lng: number, item: any, type: "student" | "db") => {
      const color = type === "student" ? MARKER_COLORS.student : MARKER_COLORS[item.source ?? "csv"];
      const pin = new PinElement({ background: color, borderColor: color, glyphColor: "#fff", scale: type === "student" ? 1.1 : 0.85 });
      const marker = new AdvancedMarkerElement({ map: googleMapRef.current!, position: { lat, lng }, content: pin.element, title: type === "student" ? item.address : (item.note || item.address) });
      marker.addListener("click", () => {
        setSelected(item);
        setSelectedType(type);
        infoWindowRef.current?.close();
        const name = type === "student" ? item.address : (item.note || item.address);
        const sub  = type === "student" ? `${item.city}, ${item.state}` : `${item.address ?? ""} ${item.city ?? ""}, ${item.state ?? ""}`.trim();
        infoWindowRef.current!.setContent(`<div style="font-family:sans-serif;padding:4px 2px"><strong style="font-size:13px">${name}</strong><br/><span style="color:#666;font-size:12px">${sub}</span></div>`);
        infoWindowRef.current!.open({ anchor: marker, map: googleMapRef.current! });
      });
      markersRef.current.push(marker);
    };

    // Student locations
    filtered.forEach(loc => {
      if (loc.lat && loc.lon) addMarker(parseFloat(loc.lat), parseFloat(loc.lon), loc, "student");
    });

    // DB entries
    if (showDb) {
      filteredDb.forEach(entry => {
        if (entry.lat && entry.lon) addMarker(parseFloat(entry.lat), parseFloat(entry.lon), entry, "db");
      });
    }
  }, [mapReady, showDb, filterState, filterStatus, locations, dbEntries]);

  useEffect(() => { plotMarkers(); }, [plotMarkers]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const states   = [...new Set(locations.map(l => l.state))].filter(Boolean).sort();
  const statuses = [...new Set(locations.map(l => l.status))].filter(Boolean).sort();

  const filtered = locations.filter(l =>
    (!filterState  || l.state  === filterState) &&
    (!filterStatus || l.status === filterStatus)
  );
  const filteredDb = dbEntries.filter(e =>
    !filterState || e.state?.toUpperCase() === filterState
  );

  const getScoreColor = (score: number) =>
    score >= 8 ? "text-green-600" : score >= 5 ? "text-yellow-600" : "text-red-600";

  const groupedByState = filtered.reduce((acc: Record<string, any[]>, l) => {
    const s = l.state || "Unknown";
    if (!acc[s]) acc[s] = [];
    acc[s].push(l);
    return acc;
  }, {});

  const dbGroupedByState = filteredDb.reduce((acc: Record<string, any[]>, e) => {
    const s = e.state?.toUpperCase() || "Unknown";
    if (!acc[s]) acc[s] = [];
    acc[s].push(e);
    return acc;
  }, {});

  const allStates = [...new Set([
    ...Object.keys(groupedByState),
    ...(showDb ? Object.keys(dbGroupedByState) : []),
  ])].sort();

  const mappedCount = filtered.filter(l => l.lat && l.lon).length
    + (showDb ? filteredDb.filter(e => e.lat && e.lon).length : 0);

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-black">Map View</h1>
          <button
            onClick={() => setShowDb(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 border-2 font-bold text-sm transition-colors ${
              showDb ? "bg-black text-white border-black" : "border-black text-black hover:bg-neutral-100"
            }`}
          >
            {dbLoading ? <Loader2 size={16} className="animate-spin" /> : showDb ? <Eye size={16} /> : <EyeOff size={16} />}
            <WashingMachine size={16} />
            {showDb ? "Showing Laundromat DB" : "Show Laundromat DB"}
            {showDb && !dbLoading && dbEntries.length > 0 && <span className="ml-1">({dbEntries.length.toLocaleString()})</span>}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative">
            <select value={filterState} onChange={e => setFilterState(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border-2 border-black text-sm font-bold bg-white focus:outline-none cursor-pointer">
              <option value="">All States</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black" />
          </div>
          <div className="relative">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border-2 border-black text-sm font-bold bg-white focus:outline-none cursor-pointer">
              <option value="">All Statuses</option>
              {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black" />
          </div>
          <span className="ml-auto flex items-center gap-2 text-sm font-bold text-neutral-500">
            {filtered.length} student{showDb && !dbLoading && ` · ${filteredDb.length.toLocaleString()} DB`}
            {showDb && dbLoading && <><Loader2 size={13} className="animate-spin" /> loading DB...</>}
            {mapReady && <span className="text-neutral-400">· {mappedCount.toLocaleString()} on map</span>}
          </span>
        </div>

        {/* Legend */}
        {mapReady && (
          <div className="flex items-center gap-4 mb-4 text-xs font-bold">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block" style={{background: MARKER_COLORS.student}} /> Student</span>
            {showDb && <>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block" style={{background: MARKER_COLORS.osm}} /> OpenStreetMap</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block" style={{background: MARKER_COLORS.csv}} /> CSV Import</span>
            </>}
          </div>
        )}

        {/* Map */}
        <div className="mb-6">
          {mapError ? (
            <div className="border-2 border-orange-400 bg-orange-50 p-6 flex items-start gap-3">
              <AlertTriangle size={20} className="text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-orange-800">Google Maps not configured</p>
                <p className="text-sm text-orange-700 mt-1">{mapError}</p>
                <code className="text-xs bg-orange-100 px-2 py-1 mt-2 inline-block font-mono">VITE_GOOGLE_MAPS_API_KEY=your_key_here</code>
              </div>
            </div>
          ) : (
            <div className="relative border-2 border-black" style={{ height: 480 }}>
              <div ref={mapRef} className="w-full h-full" />
              {!mapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-100">
                  <Loader2 size={32} className="animate-spin text-neutral-400" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* List below map */}
        {loading ? (
          <div className="text-center py-12 text-neutral-500">Loading locations...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-8">
              {allStates.length === 0 ? (
                <div className="text-center py-12 text-neutral-400">
                  <MapPin size={48} className="mx-auto mb-4 text-neutral-300" />
                  <p className="text-xl font-bold">No locations found</p>
                </div>
              ) : allStates.map(state => (
                <div key={state}>
                  <h2 className="text-lg font-black mb-3 flex items-center gap-2">
                    <MapPin size={18} /> {state}
                    <span className="text-sm font-normal text-neutral-500">
                      ({groupedByState[state]?.length ?? 0} student
                      {showDb && dbGroupedByState[state]?.length ? ` · ${dbGroupedByState[state].length.toLocaleString()} in DB` : ""})
                    </span>
                  </h2>

                  {/* Student locations */}
                  {(groupedByState[state] ?? []).map(loc => (
                    <div key={loc.id} onClick={() => { setSelected(loc); setSelectedType("student"); }}
                      className={`border-2 p-4 cursor-pointer transition-colors mb-2 ${
                        selected?.id === loc.id && selectedType === "student"
                          ? "border-black bg-black text-white"
                          : "border-neutral-200 hover:border-black bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold">{loc.address}</p>
                          <p className={`text-sm ${selected?.id === loc.id && selectedType === "student" ? "text-neutral-300" : "text-neutral-500"}`}>
                            {loc.city}, {loc.state} · by {loc.userName}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-neutral-100 text-neutral-700">
                            <UserCheck size={10} /> Student
                          </span>
                          <span className={`px-2 py-1 text-xs font-bold ${
                            selected?.id === loc.id && selectedType === "student"
                              ? "bg-white text-black"
                              : STATUS_COLORS[loc.status] ?? "bg-neutral-100 text-neutral-800"
                          }`}>{loc.status?.toUpperCase()}</span>
                          <div className="flex items-center gap-1">
                            <Star size={14} className={selected?.id === loc.id && selectedType === "student" ? "text-white" : getScoreColor(loc.dealScore)} />
                            <span className={`font-black ${selected?.id === loc.id && selectedType === "student" ? "" : getScoreColor(loc.dealScore)}`}>
                              {loc.dealScore}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* DB entries */}
                  {showDb && (dbGroupedByState[state] ?? []).map(entry => {
                    const badge = SOURCE_BADGE[entry.source ?? "student"];
                    const BadgeIcon = badge?.Icon ?? UserCheck;
                    const isSelected = selected?.id === entry.id && selectedType === "db";
                    return (
                      <div key={entry.id} onClick={() => { setSelected(entry); setSelectedType("db"); }}
                        className={`border-2 p-4 cursor-pointer transition-colors mb-2 ${
                          isSelected ? "border-black bg-black text-white" : "border-dashed border-neutral-300 hover:border-black bg-neutral-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm">{entry.note || entry.address}</p>
                            {entry.note && <p className={`text-xs ${isSelected ? "text-neutral-300" : "text-neutral-500"}`}>{entry.address}</p>}
                            <p className={`text-xs ${isSelected ? "text-neutral-400" : "text-neutral-400"}`}>
                              {entry.city}, {entry.state} {entry.zip ?? ""}
                            </p>
                          </div>
                          <span className={`flex items-center gap-1 px-2 py-1 text-xs font-bold w-fit ${
                            isSelected ? "bg-white text-black" : (badge?.className ?? "bg-neutral-100 text-neutral-700")
                          }`}>
                            <BadgeIcon size={11} />
                            {badge?.label ?? entry.source}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-1">
              {selected ? (
                <div className="bg-white border-2 border-black p-6 sticky top-4">
                  {selectedType === "student" ? (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-neutral-100 text-neutral-700">
                          <UserCheck size={11} /> Student Location
                        </span>
                      </div>
                      <h3 className="text-xl font-black mb-1">{selected.address}</h3>
                      <p className="text-neutral-600 mb-4">{selected.city}, {selected.state}</p>
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between border-b pb-2">
                          <span className="font-bold text-sm">Deal Score</span>
                          <span className={`font-black text-lg ${getScoreColor(selected.dealScore)}`}>{selected.dealScore}/10</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                          <span className="font-bold text-sm">Status</span>
                          <span className={`px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[selected.status] ?? ""}`}>
                            {selected.status?.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                          <span className="font-bold text-sm">Submitted By</span>
                          <span className="text-neutral-600 text-sm">{selected.userName}</span>
                        </div>
                        <div className="flex justify-between pb-2">
                          <span className="font-bold text-sm">Date Added</span>
                          <span className="text-neutral-600 text-sm">{new Date(selected.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {selected.notes && (
                        <div>
                          <p className="font-bold text-sm mb-1">Notes</p>
                          <p className="text-neutral-600 text-sm">{selected.notes}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        {(() => {
                          const badge = SOURCE_BADGE[selected.source ?? "student"];
                          const BadgeIcon = badge?.Icon ?? WashingMachine;
                          return (
                            <span className={`flex items-center gap-1 px-2 py-1 text-xs font-bold ${badge?.className ?? "bg-neutral-100 text-neutral-700"}`}>
                              <BadgeIcon size={11} /> {badge?.label ?? selected.source}
                            </span>
                          );
                        })()}
                      </div>
                      {selected.note && <h3 className="text-xl font-black mb-1">{selected.note}</h3>}
                      <p className="text-neutral-700 font-bold mb-0.5">{selected.address}</p>
                      <p className="text-neutral-600 mb-4">{selected.city}, {selected.state} {selected.zip ?? ""}</p>
                      <div className="space-y-3">
                        {selected.lat && selected.lon && (
                          <div className="flex justify-between border-b pb-2">
                            <span className="font-bold text-sm">Coordinates</span>
                            <span className="text-neutral-600 text-xs font-mono">{Number(selected.lat).toFixed(4)}, {Number(selected.lon).toFixed(4)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pb-2">
                          <span className="font-bold text-sm">Date Added</span>
                          <span className="text-neutral-600 text-sm">
                            {selected.reportedAt ? new Date(selected.reportedAt).toLocaleDateString() : "—"}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                  <button onClick={() => { setSelected(null); infoWindowRef.current?.close(); }}
                    className="mt-4 text-sm font-bold underline text-neutral-500">
                    Close
                  </button>
                </div>
              ) : (
                <div className="bg-neutral-50 border-2 border-neutral-200 p-6 text-center text-neutral-400">
                  <MapPin size={32} className="mx-auto mb-2" />
                  <p>Click a pin or list item to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
