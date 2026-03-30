import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/layouts/admin-layout";
import { DollarSign, Users, Globe, Eye, EyeOff, TrendingUp } from "lucide-react";
import { projectId } from "/utils/supabase/info";
import { toast } from "sonner";

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRevenue, setShowRevenue] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast.error("Not authenticated");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/admin/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      setStats(data.stats);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching stats:", err);
      toast.error("Failed to load dashboard stats");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="text-center py-12">
            <p className="text-xl text-neutral-600">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-4xl font-black mb-8">Dashboard</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 1 — Revenue */}
          <div className="bg-white border-2 border-black p-6 text-center relative">
            <button
              onClick={() => setShowRevenue(v => !v)}
              className="absolute top-3 right-3 text-neutral-400 hover:text-black transition-colors"
            >
              {showRevenue ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <div className="flex justify-center mb-2">
              <DollarSign size={24} />
            </div>
            <p className="text-3xl font-black mb-1">
              {showRevenue ? `$${(stats?.totalRevenue || 0).toLocaleString()}` : "••••••"}
            </p>
            <p className="text-sm text-neutral-600">Total Revenue</p>
          </div>

          {/* 2 — Total Students */}
          <div className="bg-white border-2 border-black p-6 text-center">
            <div className="flex justify-center mb-2">
              <Users size={24} />
            </div>
            <p className="text-3xl font-black mb-1">{stats?.totalStudents || 0}</p>
            <p className="text-sm text-neutral-600">Total Students</p>
          </div>

          {/* 3 — Site Visitors */}
          <div className="bg-white border-2 border-black p-6 text-center">
            <div className="flex justify-center mb-2">
              <Globe size={24} />
            </div>
            <p className="text-3xl font-black mb-1">{stats?.totalVisitors || 0}</p>
            <p className="text-sm text-neutral-600">Site Visitors</p>
          </div>

          {/* 4 — Conversion Rate */}
          <div className="bg-white border-2 border-black p-6 text-center">
            <div className="flex justify-center mb-2">
              <TrendingUp size={24} />
            </div>
            <p className="text-3xl font-black mb-1">
              {stats?.totalVisitors > 0
                ? `${((stats.totalStudents / stats.totalVisitors) * 100).toFixed(1)}%`
                : "0%"}
            </p>
            <p className="text-sm text-neutral-600">Conversion Rate</p>
          </div>
        </div>

        {/* Avg Revenue Per Student */}
        <div className="bg-white border-2 border-black p-6 mb-8 flex items-center justify-between">
          <h2 className="text-xl font-black">Avg. Revenue / Student</h2>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-black">
              {showRevenue
                ? stats?.totalStudents > 0
                  ? `$${Math.round(stats.totalRevenue / stats.totalStudents).toLocaleString()}`
                  : "$0"
                : "••••••"}
            </p>
            <button
              onClick={() => setShowRevenue(v => !v)}
              className="text-neutral-400 hover:text-black transition-colors"
            >
              {showRevenue ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Recent Users */}
        {stats?.recentUsers && stats.recentUsers.length > 0 && (
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-black mb-4">Recent Sign-ups</h2>
            <div className="space-y-4">
              {stats.recentUsers.map((user: any, index: number) => (
                <div key={user.id || index} className="flex items-center justify-between border-b border-neutral-200 pb-4 last:border-0">
                  <div>
                    <p className="font-bold">{user.name}</p>
                    <p className="text-sm text-neutral-600">{user.email}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className={`px-2 py-1 text-xs font-bold ${
                      user.isAdmin ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                    }`}>
                      {user.isAdmin ? "Admin" : "Student"}
                    </span>
                    <p className="text-xs text-neutral-400">
                      {user.enrolledAt ? new Date(user.enrolledAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
