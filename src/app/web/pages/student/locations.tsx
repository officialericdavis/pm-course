import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { StudentLayout } from "../../components/layouts/student-layout";
import { MapPin, Star, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { projectId } from "/utils/supabase/info";

const STATUS_COLORS: Record<string, string> = {
  researching: "bg-blue-100 text-blue-800 border-blue-300",
  interested: "bg-green-100 text-green-800 border-green-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
  acquired: "bg-purple-100 text-purple-800 border-purple-300",
};

const STATUS_OPTIONS = ["researching", "interested", "acquired", "rejected"];

export function StudentLocations() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchLocations(); }, []);

  const fetchLocations = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) { navigate("/login"); return; }

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/locations/my`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) setLocations(data.locations ?? []);
    } catch {
      toast.error("Failed to load locations");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/locations/${id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        setLocations((prev) => prev.filter((l) => l.id !== id));
        if (selectedLocation?.id === id) setSelectedLocation(null);
        toast.success("Location deleted");
      } else {
        toast.error("Failed to delete location");
      }
    } catch {
      toast.error("Failed to delete location");
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedLocation) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/locations/${selectedLocation.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: editStatus, notes: editNotes }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setLocations((prev) => prev.map((l) => (l.id === selectedLocation.id ? data.location : l)));
        setSelectedLocation(data.location);
        toast.success("Location updated");
      } else {
        toast.error(data.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update location");
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (location: any) => {
    setSelectedLocation(location);
    setEditStatus(location.status);
    setEditNotes(location.notes);
  };

  const getScoreColor = (score: number) =>
    score >= 8 ? "text-green-600" : score >= 5 ? "text-yellow-600" : "text-red-600";

  const avgScore = locations.length > 0
    ? (locations.reduce((sum, l) => sum + l.dealScore, 0) / locations.length).toFixed(1)
    : "—";

  return (
    <StudentLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black mb-2">My Locations</h1>
            <p className="text-neutral-600">Track and manage your potential laundromat locations</p>
          </div>
          <button
            onClick={() => navigate("/student/analyze")}
            className="bg-black text-white px-6 py-3 font-bold hover:bg-neutral-800 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            ADD LOCATION
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border-2 border-black p-6 text-center">
            <p className="text-3xl font-black mb-1">{locations.length}</p>
            <p className="text-sm text-neutral-600">Total Locations</p>
          </div>
          <div className="bg-white border-2 border-black p-6 text-center">
            <p className="text-3xl font-black mb-1">{locations.filter((l) => l.status === "interested").length}</p>
            <p className="text-sm text-neutral-600">Interested</p>
          </div>
          <div className="bg-white border-2 border-black p-6 text-center">
            <p className="text-3xl font-black mb-1">{locations.filter((l) => l.status === "researching").length}</p>
            <p className="text-sm text-neutral-600">Researching</p>
          </div>
          <div className="bg-white border-2 border-black p-6 text-center">
            <p className="text-3xl font-black mb-1">{avgScore}</p>
            <p className="text-sm text-neutral-600">Avg Deal Score</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-neutral-500">Loading locations...</div>
        ) : locations.length === 0 ? (
          <div className="bg-neutral-50 border-2 border-neutral-200 p-12 text-center">
            <MapPin size={48} className="mx-auto mb-4 text-neutral-300" />
            <p className="text-xl font-bold text-neutral-400 mb-2">No locations yet</p>
            <p className="text-neutral-400 mb-6">Start analyzing potential laundromat spots</p>
            <button
              onClick={() => navigate("/student/analyze")}
              className="bg-black text-white px-6 py-3 font-bold hover:bg-neutral-800"
            >
              ANALYZE FIRST LOCATION
            </button>
          </div>
        ) : (
          <div className="bg-white border-2 border-black overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-2 border-black bg-neutral-50">
                <tr>
                  <th className="text-left p-4 font-black">Address</th>
                  <th className="text-left p-4 font-black">City / State</th>
                  <th className="text-left p-4 font-black">Deal Score</th>
                  <th className="text-left p-4 font-black">Status</th>
                  <th className="text-left p-4 font-black">Date Added</th>
                  <th className="text-left p-4 font-black">Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((location) => (
                  <tr
                    key={location.id}
                    className="border-b border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
                    onClick={() => openDetail(location)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} />
                        <span className="font-medium">{location.address}</span>
                      </div>
                    </td>
                    <td className="p-4 text-neutral-600">{location.city}, {location.state}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Star size={16} className={getScoreColor(location.dealScore)} />
                        <span className={`font-black ${getScoreColor(location.dealScore)}`}>
                          {location.dealScore}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded text-xs font-bold border ${STATUS_COLORS[location.status] ?? "bg-neutral-100 text-neutral-800"}`}>
                        {location.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-neutral-600">
                      {new Date(location.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(location.id); }}
                        className="p-2 hover:bg-red-100 transition-colors rounded"
                        title="Delete"
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detail Panel */}
        {selectedLocation && (
          <div className="fixed inset-y-0 right-0 w-96 bg-white border-l-2 border-black shadow-lg p-6 overflow-auto z-50">
            <button onClick={() => setSelectedLocation(null)} className="mb-4 text-sm font-bold hover:underline">
              ← CLOSE
            </button>
            <h2 className="text-2xl font-black mb-1">{selectedLocation.address}</h2>
            <p className="text-neutral-600 mb-6">{selectedLocation.city}, {selectedLocation.state}</p>

            <div className="mb-4">
              <p className="text-sm font-bold mb-1">Deal Score</p>
              <p className={`text-4xl font-black ${getScoreColor(selectedLocation.dealScore)}`}>
                {selectedLocation.dealScore}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-4 py-2 border-2 border-black focus:outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold mb-2">Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-4 py-3 border-2 border-black focus:outline-none h-28 resize-none"
              />
            </div>

            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="w-full bg-black text-white px-6 py-3 font-bold hover:bg-neutral-800 disabled:opacity-50 mb-3"
            >
              {saving ? "SAVING..." : "SAVE CHANGES"}
            </button>
            <button
              onClick={() => { if (confirm("Delete this location?")) handleDelete(selectedLocation.id); }}
              className="w-full border-2 border-red-500 text-red-600 px-6 py-3 font-bold hover:bg-red-50"
            >
              DELETE LOCATION
            </button>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
