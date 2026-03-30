import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/layouts/admin-layout";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { projectId } from "/utils/supabase/info";
import { toast } from "sonner";

const MODULE_LABELS: Record<string, string> = {
  "module-1": "M1: Foundation",
  "module-2": "M2: Market Research",
  "module-3": "M3: Deal Analysis",
  "module-4": "M4: Securing Deal",
  "module-5": "M5: Setup",
  "module-6": "M6: Operations",
  "module-7": "M7: Scale",
};

export function AdminAnalytics() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    Promise.all([
      fetch(`https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([statsData, usersData]) => {
        setStats(statsData.stats);
        setUsers(usersData.users ?? []);
      })
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  const moduleData = stats
    ? Object.entries(stats.moduleCompletions).map(([id, count]) => ({
        name: MODULE_LABELS[id] ?? id,
        completions: count as number,
        rate: stats.totalStudents > 0 ? Math.round(((count as number) / stats.totalStudents) * 100) : 0,
      }))
    : [];

  const enrollmentByMonth: Record<string, number> = {};
  users.forEach((u) => {
    const month = new Date(u.enrolledAt).toLocaleDateString("en-US", { year: "numeric", month: "short" });
    enrollmentByMonth[month] = (enrollmentByMonth[month] ?? 0) + 1;
  });
  const enrollmentData = Object.entries(enrollmentByMonth)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([month, count]) => ({ month, count }));

  const progressBuckets = [
    { label: "0%", count: 0 },
    { label: "1–25%", count: 0 },
    { label: "26–50%", count: 0 },
    { label: "51–75%", count: 0 },
    { label: "76–99%", count: 0 },
    { label: "100%", count: 0 },
  ];
  users.filter((u) => !u.isAdmin).forEach((u) => {
    const pct = ((u.completedModules?.length ?? 0) / 7) * 100;
    if (pct === 0) progressBuckets[0].count++;
    else if (pct <= 25) progressBuckets[1].count++;
    else if (pct <= 50) progressBuckets[2].count++;
    else if (pct <= 75) progressBuckets[3].count++;
    else if (pct < 100) progressBuckets[4].count++;
    else progressBuckets[5].count++;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8 text-center py-12 text-neutral-500">Loading analytics...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-4xl font-black mb-8">Analytics</h1>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border-2 border-black p-6 text-center">
            <p className="text-3xl font-black mb-1">{stats?.totalUsers ?? 0}</p>
            <p className="text-sm text-neutral-600">Total Users</p>
          </div>
          <div className="bg-white border-2 border-black p-6 text-center">
            <p className="text-3xl font-black mb-1">{stats?.totalStudents ?? 0}</p>
            <p className="text-sm text-neutral-600">Students</p>
          </div>
          <div className="bg-white border-2 border-black p-6 text-center">
            <p className="text-3xl font-black mb-1">
              {stats
                ? Math.round(
                    (Object.values(stats.moduleCompletions).reduce((a: any, b: any) => a + b, 0) as number) /
                      Math.max(stats.totalStudents, 1) /
                      7 *
                      100
                  )
                : 0}%
            </p>
            <p className="text-sm text-neutral-600">Avg Completion</p>
          </div>
          <div className="bg-white border-2 border-black p-6 text-center">
            <p className="text-3xl font-black mb-1">
              {stats ? Object.values(stats.moduleCompletions).reduce((a: any, b: any) => a + b, 0) : 0}
            </p>
            <p className="text-sm text-neutral-600">Module Completions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Module Completion Chart */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-black mb-4">Module Completion Rate</h2>
            {moduleData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={moduleData} margin={{ bottom: 60 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="rate" fill="#000">
                    {moduleData.map((_, i) => (
                      <Cell key={i} fill={i % 2 === 0 ? "#000" : "#555"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-neutral-400">No data yet</div>
            )}
          </div>

          {/* Student Progress Distribution */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-black mb-4">Student Progress Distribution</h2>
            {users.filter((u) => !u.isAdmin).length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={progressBuckets}>
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Students" fill="#000" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-neutral-400">No students yet</div>
            )}
          </div>

          {/* Enrollment Over Time */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-black mb-4">Enrollment Over Time</h2>
            {enrollmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={enrollmentData}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="New Users" fill="#000" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-neutral-400">No data yet</div>
            )}
          </div>

          {/* Module Completion Raw Numbers */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-black mb-4">Module Completions</h2>
            {moduleData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={moduleData} margin={{ bottom: 60 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="completions" name="Students Completed" fill="#000" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-neutral-400">No data yet</div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
