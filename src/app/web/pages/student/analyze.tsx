import { useState } from "react";
import { useNavigate } from "react-router";
import { StudentLayout } from "../../components/layouts/student-layout";
import { Search, MapPin, Save, ExternalLink, TrendingUp, Home, DollarSign, Car, AlertCircle, CheckCircle, Loader2, Hotel, Building2, GraduationCap, WashingMachine } from "lucide-react";
import { toast } from "sonner";
import { projectId } from "/utils/supabase/info";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c`;

// Detect imperial (US) vs metric — US, Liberia, Myanmar use imperial
const usesImperial = (() => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    const lang = navigator.language ?? "";
    return tz.startsWith("America/") || lang === "en-US";
  } catch {
    return true;
  }
})();
const NEARBY_RADIUS_LABEL = usesImperial ? "1 mile" : "1.6 km";

const STATUS_OPTIONS = [
  { value: "researching", label: "Researching" },
  { value: "interested", label: "Interested" },
  { value: "acquired", label: "Acquired" },
  { value: "rejected", label: "Rejected" },
];

function ScoreBadge({ score, max = 10 }: { score: number | null; max?: number }) {
  if (score == null) return <span className="text-neutral-400 text-sm">No data</span>;
  const pct = score / max;
  const color = pct >= 0.75 ? "text-green-600 bg-green-50 border-green-300"
    : pct >= 0.5 ? "text-yellow-600 bg-yellow-50 border-yellow-300"
    : "text-red-600 bg-red-50 border-red-300";
  return (
    <span className={`px-2 py-0.5 text-sm font-black border ${color}`}>{score}/{max}</span>
  );
}

function DataCard({ icon, label, value, sub, score }: { icon: React.ReactNode; label: string; value: string; sub?: string; score?: number | null }) {
  const hasScore = score != null;
  const pct = hasScore ? score / 10 : null;
  const barColor = pct == null ? "bg-neutral-300" : pct >= 0.75 ? "bg-green-500" : pct >= 0.5 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="bg-white border-2 border-black p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-neutral-500">{icon}<span className="text-xs font-bold uppercase tracking-wide">{label}</span></div>
        {hasScore && <ScoreBadge score={score} />}
      </div>
      <p className="text-2xl font-black mb-1">{value}</p>
      {sub && <p className="text-xs text-neutral-500">{sub}</p>}
      {hasScore && pct != null && (
        <div className="mt-3 w-full bg-neutral-200 h-1.5">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct * 100}%` }} />
        </div>
      )}
    </div>
  );
}

export function StudentAnalyze() {
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [notes, setNotes] = useState("");
  const [dealScore, setDealScore] = useState(5);
  const [status, setStatus] = useState("researching");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [isExistingLaundromat, setIsExistingLaundromat] = useState(false);
  const [existingNote, setExistingNote] = useState("");
  const navigate = useNavigate();

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 5) return "text-yellow-600";
    return "text-red-600";
  };

  const getViabilityLabel = (score: number) => {
    if (score >= 8) return "Excellent Opportunity";
    if (score >= 6.5) return "Strong Opportunity";
    if (score >= 5) return "Moderate Opportunity";
    if (score >= 3) return "Weak Opportunity";
    return "Poor Fit";
  };

  const handleAnalyze = async () => {
    if (!address.trim() || !city.trim() || !state.trim()) {
      toast.error("Enter address, city, and state first");
      return;
    }
    setAnalyzing(true);
    setAnalysisError("");
    setAnalysis(null);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/analyze-location`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ address, city, state, zip }),
      });
      const data = await res.json();
      if (!res.ok) { setAnalysisError(data.error || "Analysis failed"); setAnalyzing(false); return; }
      setAnalysis(data);
      // Auto-set deal score from viability if we got data
      if (data.scores?.viability != null) {
        setDealScore(Math.round(data.scores.viability));
      }
    } catch {
      setAnalysisError("Could not reach analysis service. Try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    if (!token) { navigate("/login"); return; }
    setSaving(true);
    try {
      const response = await fetch(`${API}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          address, city, state, notes, dealScore, status,
          analysisData: analysis ?? null,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        if (isExistingLaundromat) {
          fetch(`${API}/locations/mark-existing`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              address, city, state,
              zip: analysis?.zip ?? zip ?? null,
              lat: analysis?.geocode?.lat ?? null,
              lon: analysis?.geocode?.lon ?? null,
              note: existingNote.trim(),
            }),
          }).catch(() => {});
        }
        toast.success("Location saved to My Locations!");
        navigate("/student/locations");
      } else {
        toast.error(data.error || "Failed to save location.");
      }
    } catch {
      toast.error("Failed to save location.");
    } finally {
      setSaving(false);
    }
  };

  // Use geocoded coordinates for precision; fall back to address string
  const mapsUrl = analysis?.geocode?.lat && analysis?.geocode?.lon
    ? `https://www.google.com/maps/@${analysis.geocode.lat},${analysis.geocode.lon},16z/data=!5m1!1e1`
    : address && city && state
    ? `https://www.google.com/maps/search/${encodeURIComponent(`${address}, ${city}, ${state}`)}`
    : null;

  const formatIncome = (val: number | null) => {
    if (!val || val < 0) return "N/A";
    return `$${val.toLocaleString()}`;
  };

  return (
    <StudentLayout>
      <div className="p-8">
        <h1 className="text-4xl font-black mb-2">Analyze Location</h1>
        <p className="text-neutral-600 mb-8">
          Enter an address to get real demographic and traffic data — then save it to your tracker.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white border-2 border-black p-8">
            <h2 className="text-2xl font-black mb-6">Location Details</h2>

            <form onSubmit={handleSave}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Street Address</label>
                <div className="relative">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black pl-10"
                    placeholder="123 Main St"
                    required
                  />
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2" size={20} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold mb-2">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="Austin"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="TX"
                    maxLength={2}
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">ZIP Code <span className="text-neutral-400 font-normal">(for income & renter data)</span></label>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/, "").slice(0, 5))}
                  className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="78701"
                  maxLength={5}
                />
              </div>

              <div className="mb-6 bg-neutral-50 border-2 border-black p-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isExistingLaundromat}
                    onChange={(e) => setIsExistingLaundromat(e.target.checked)}
                    className="w-4 h-4 accent-black shrink-0"
                  />
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <WashingMachine size={15} />
                    This location is already a laundromat
                  </span>
                </label>
                {isExistingLaundromat && (
                  <input
                    type="text"
                    value={existingNote}
                    onChange={(e) => setExistingNote(e.target.value)}
                    placeholder="e.g. Coin-op on corner of Main & 5th"
                    className="w-full mt-3 px-3 py-2 border-2 border-black text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
                  />
                )}
              </div>

              {/* Analyze Button */}
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing || !address.trim() || !city.trim() || !state.trim()}
                className="w-full bg-black text-white px-8 py-3 font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mb-6"
              >
                {analyzing ? <><Loader2 size={18} className="animate-spin" /> ANALYZING...</> : <><Search size={18} /> ANALYZE THIS LOCATION</>}
              </button>

              {analysisError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-300 text-red-700 p-3 mb-4 text-sm">
                  <AlertCircle size={16} /> {analysisError}
                </div>
              )}

              <div className="border-t-2 border-neutral-200 pt-6">
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-2">
                    Your Deal Score: <span className={`text-xl font-black ${getScoreColor(dealScore)}`}>{dealScore}/10</span>
                  </label>
                  <input
                    type="range" min={1} max={10} step={0.5} value={dealScore}
                    onChange={(e) => setDealScore(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-neutral-500 mt-1">
                    <span>1 - Weak</span><span>5 - Moderate</span><span>10 - Strong</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-bold mb-2">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-bold mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black h-28 resize-none"
                    placeholder="Observations about foot traffic, competition, seller motivation..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-black text-white px-8 py-4 font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {saving ? "SAVING..." : "SAVE TO MY LOCATIONS"}
                </button>
              </div>
            </form>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">

            {/* Viability Score */}
            {analysis ? (
              <>
                <div className={`border-2 p-6 ${
                  analysis.scores.viability >= 7 ? "bg-green-50 border-green-500"
                  : analysis.scores.viability >= 5 ? "bg-yellow-50 border-yellow-500"
                  : "bg-red-50 border-red-500"
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-1">Laundromat Viability Score</p>
                      <p className={`text-7xl font-black leading-none ${getScoreColor(analysis.scores.viability ?? 0)}`}>
                        {analysis.scores.viability ?? "—"}
                      </p>
                    </div>
                    <span className={`text-sm font-bold mt-2 ${getScoreColor(analysis.scores.viability ?? 0)}`}>
                      {getViabilityLabel(analysis.scores.viability ?? 0)}
                    </span>
                  </div>
                  {analysis.geocode?.displayName && (
                    <p className="text-xs text-neutral-500 mt-3 truncate">{analysis.geocode.displayName}</p>
                  )}
                </div>

                {/* Data Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DataCard
                    icon={<DollarSign size={16} />}
                    label="Median Household Income"
                    value={formatIncome(analysis.census?.medianIncome)}
                    sub={analysis.census?.medianIncome >= 28000 && analysis.census?.medianIncome <= 75000
                      ? "✓ Sweet spot for laundromat customers"
                      : analysis.census?.medianIncome > 75000
                      ? "High income — lower laundromat need"
                      : analysis.census?.medianIncome < 20000
                      ? "Very low income — affordability risk"
                      : ""}
                    score={analysis.scores.income}
                  />
                  <DataCard
                    icon={<Home size={16} />}
                    label="Renter vs Owner"
                    value={analysis.census?.renterPct != null ? `${analysis.census.renterPct}% Renters` : "N/A"}
                    sub={analysis.census
                      ? `${analysis.census.ownerOccupied.toLocaleString()} owned · ${analysis.census.renterOccupied.toLocaleString()} rented`
                      : "ZIP code required for this data"}
                    score={analysis.scores.renter}
                  />
                  <DataCard
                    icon={<Car size={16} />}
                    label="Road Traffic Level"
                    value={analysis.road?.label ?? "Unknown"}
                    sub={analysis.road?.name ? `Road: ${analysis.road.name}` : "Based on OpenStreetMap road classification"}
                    score={analysis.scores.road}
                  />
                  <DataCard
                    icon={<TrendingUp size={16} />}
                    label="Population (ZIP)"
                    value={analysis.census?.population ? analysis.census.population.toLocaleString() : "N/A"}
                    sub="Total residents in this ZIP code"
                  />
                </div>

                {/* Nearby POI summary */}
                {analysis.nearby && (
                  <div className="bg-white border-2 border-black p-5">
                    <p className="text-xs font-bold uppercase tracking-wide mb-3 text-neutral-500">What's Nearby ({NEARBY_RADIUS_LABEL} radius)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`flex items-center gap-2 p-3 border ${analysis.nearby.hotelsResorts >= 2 ? "border-red-300 bg-red-50" : analysis.nearby.hotelsResorts === 1 ? "border-yellow-300 bg-yellow-50" : "border-neutral-200 bg-neutral-50"}`}>
                        <Hotel size={16} className={analysis.nearby.hotelsResorts >= 1 ? "text-red-500" : "text-neutral-400"} />
                        <div>
                          <p className="text-lg font-black leading-none">{analysis.nearby.hotelsResorts}</p>
                          <p className="text-xs text-neutral-500">Hotels / Resorts</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 p-3 border ${analysis.nearby.laundromats >= 4 ? "border-red-300 bg-red-50" : analysis.nearby.laundromats >= 2 ? "border-yellow-300 bg-yellow-50" : analysis.nearby.laundromats === 1 ? "border-yellow-100 bg-yellow-50" : "border-green-200 bg-green-50"}`}>
                        <WashingMachine size={16} className={analysis.nearby.laundromats >= 4 ? "text-red-500" : analysis.nearby.laundromats >= 1 ? "text-yellow-600" : "text-green-600"} />
                        <div>
                          <p className="text-lg font-black leading-none">{analysis.nearby.laundromats}</p>
                          <p className="text-xs text-neutral-500">Competitors Nearby</p>
                          <p className="text-xs text-neutral-400">{analysis.nearby.laundromatsSource}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 p-3 border ${analysis.nearby.apartments >= 3 ? "border-green-300 bg-green-50" : "border-neutral-200 bg-neutral-50"}`}>
                        <Building2 size={16} className={analysis.nearby.apartments >= 3 ? "text-green-600" : "text-neutral-400"} />
                        <div>
                          <p className="text-lg font-black leading-none">{analysis.nearby.apartments}</p>
                          <p className="text-xs text-neutral-500">Apt Buildings</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 p-3 border ${analysis.nearby.universities >= 1 ? "border-green-300 bg-green-50" : "border-neutral-200 bg-neutral-50"}`}>
                        <GraduationCap size={16} className={analysis.nearby.universities >= 1 ? "text-green-600" : "text-neutral-400"} />
                        <div>
                          <p className="text-lg font-black leading-none">{analysis.nearby.universities}</p>
                          <p className="text-xs text-neutral-500">Universities</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Location flags */}
                {analysis.locationFlags?.length > 0 && (
                  <div className="bg-neutral-50 border-2 border-neutral-300 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide mb-2 text-neutral-500">Location Intelligence</p>
                    <ul className="text-sm space-y-2">
                      {analysis.locationFlags.map((flag: any, i: number) => (
                        <li key={i} className="flex gap-2">
                          {flag.type === "positive"
                            ? <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />
                            : flag.type === "warning"
                            ? <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                            : <AlertCircle size={14} className="text-yellow-500 shrink-0 mt-0.5" />}
                          <span className="text-neutral-700">{flag.message}</span>
                        </li>
                      ))}
                      {!analysis.census && <li className="flex gap-2"><AlertCircle size={14} className="text-neutral-400 shrink-0 mt-0.5" /><span className="text-neutral-500">Add a ZIP code and re-analyze to get income and renter data.</span></li>}
                    </ul>
                  </div>
                )}

                {/* Known laundromats database for this ZIP */}
                {analysis.communityLaundromats?.length > 0 && (
                  <div className="bg-white border-2 border-black p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <WashingMachine size={14} className="text-black" />
                      <p className="text-xs font-bold uppercase tracking-wide text-black">Known Laundromats in This Area</p>
                    </div>
                    <ul className="space-y-2">
                      {analysis.communityLaundromats.map((el: any, i: number) => (
                        <li key={i} className="text-sm text-neutral-700 flex items-start gap-2">
                          <MapPin size={13} className="text-neutral-400 shrink-0 mt-0.5" />
                          <span>
                            <span className="font-bold">{el.address}{el.city ? `, ${el.city}` : ""}</span>
                            {el.note && <span className="text-neutral-500"> — {el.note}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* View Traffic button */}
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full border-2 border-black py-3 font-bold text-sm hover:bg-black hover:text-white transition-colors"
                  >
                    <ExternalLink size={16} />
                    VIEW LIVE TRAFFIC ON GOOGLE MAPS
                  </a>
                )}
              </>
            ) : (
              <div className="bg-white border-2 border-black p-8 text-center">
                <Search size={40} className="mx-auto text-neutral-300 mb-4" />
                <p className="font-bold text-lg mb-2">No analysis yet</p>
                <p className="text-sm text-neutral-500">Fill in the address and click <strong>Analyze This Location</strong> to get income, renter, and traffic data pulled from real sources.</p>
                <div className="mt-6 text-left space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-400 mb-2">What you'll get:</p>
                  {["Median household income (Census)", "% Renters vs homeowners (Census)", "Road traffic classification (OpenStreetMap)", "Laundromat viability score"].map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm text-neutral-600">
                      <div className="w-1.5 h-1.5 bg-black rounded-full shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
