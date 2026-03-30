import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/layouts/admin-layout";
import { Search } from "lucide-react";
import { projectId } from "/utils/supabase/info";
import { toast } from "sonner";

export function AdminActivity() {
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/admin/activity`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.json())
      .then((data) => { setActivity(data.activity ?? []); setLoading(false); })
      .catch(() => { toast.error("Failed to load activity"); setLoading(false); });
  }, []);

  const filtered = activity.filter(
    (log) =>
      log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-4xl font-black mb-8">Activity Logs</h1>

        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
            <input
              type="text"
              placeholder="Search by user or action..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-neutral-500">Loading activity...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            {activity.length === 0 ? "No activity recorded yet" : "No results match your search"}
          </div>
        ) : (
          <div className="bg-white border-2 border-black overflow-hidden">
            <table className="w-full">
              <thead className="bg-black text-white">
                <tr>
                  <th className="text-left p-4 font-bold">User</th>
                  <th className="text-left p-4 font-bold">Action</th>
                  <th className="text-left p-4 font-bold">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, index) => (
                  <tr
                    key={log.id}
                    className={`border-b border-neutral-200 ${index % 2 === 0 ? "bg-white" : "bg-neutral-50"}`}
                  >
                    <td className="p-4 font-bold">{log.userName}</td>
                    <td className="p-4 text-neutral-600">{log.action}</td>
                    <td className="p-4 text-neutral-600">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
