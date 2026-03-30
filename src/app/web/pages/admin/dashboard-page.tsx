import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { projectId } from "/utils/supabase/info";
import { Navbar } from "../../components/layouts/navbar";
import { Users, Award, TrendingUp, Shield, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        console.error("[Admin Dashboard] No access token found");
        toast.error("Not authenticated. Please log in.");
        navigate("/login");
        return;
      }

      // Fetch current user
      const userResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/user`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!userResponse.ok) {
        console.error("[Admin Dashboard] Failed to fetch user");
        toast.error("Authentication failed");
        navigate("/login");
        return;
      }

      const userData = await userResponse.json();

      if (!userData.user?.isAdmin) {
        console.error("[Admin Dashboard] User is not an admin");
        toast.error("Access denied. Admin only.");
        navigate("/course-content");
        return;
      }

      setCurrentUser(userData.user);

      // Fetch all users
      const usersResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/admin/users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }

      // Fetch stats
      const statsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/admin/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      setLoading(false);
    } catch (err) {
      console.error("Admin auth check error:", err);
      toast.error("Failed to load admin dashboard");
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string) => {
    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        toast.error("Not authenticated");
        navigate("/login");
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/admin/toggle-admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (response.ok) {
        toast.success("User role updated successfully");
        // Refresh data
        checkAdminAuth();
      } else {
        toast.error("Failed to update user role");
      }
    } catch (err) {
      console.error("Toggle admin error:", err);
      toast.error("Failed to update user role");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-12">
            <button
              onClick={() => navigate("/course-content")}
              className="border-2 border-black px-6 py-3 font-bold hover:bg-black hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              BACK TO COURSE
            </button>
            <div>
              <h1 className="text-5xl font-black tracking-tight mb-2">
                Admin Dashboard
              </h1>
              <p className="text-xl text-neutral-600">
                Manage users and track course progress
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          {stats && (
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-neutral-50 border-4 border-black p-6">
                <div className="flex items-center gap-4 mb-2">
                  <Users className="w-8 h-8" />
                  <h3 className="text-xl font-bold">Total Users</h3>
                </div>
                <p className="text-5xl font-black">{stats.totalUsers}</p>
                <p className="text-sm text-neutral-600 mt-2">
                  {stats.totalStudents} students, {stats.totalAdmins} admins
                </p>
              </div>

              <div className="bg-neutral-50 border-4 border-black p-6">
                <div className="flex items-center gap-4 mb-2">
                  <Award className="w-8 h-8" />
                  <h3 className="text-xl font-bold">Module Completions</h3>
                </div>
                <p className="text-5xl font-black">
                  {Object.values(stats.moduleCompletions).reduce(
                    (a: any, b: any) => a + b,
                    0
                  )}
                </p>
                <p className="text-sm text-neutral-600 mt-2">
                  Across all modules
                </p>
              </div>

              <div className="bg-neutral-50 border-4 border-black p-6">
                <div className="flex items-center gap-4 mb-2">
                  <TrendingUp className="w-8 h-8" />
                  <h3 className="text-xl font-bold">Avg. Progress</h3>
                </div>
                <p className="text-5xl font-black">
                  {Math.round(
                    (Object.values(stats.moduleCompletions).reduce(
                      (a: any, b: any) => a + b,
                      0
                    ) as number) /
                      stats.totalUsers /
                      7 *
                      100
                  )}%
                </p>
                <p className="text-sm text-neutral-600 mt-2">
                  Average completion rate
                </p>
              </div>
            </div>
          )}

          {/* Module Stats */}
          {stats && (
            <div className="bg-white border-4 border-black p-6 mb-12">
              <h2 className="text-3xl font-black mb-6">Module Completion Stats</h2>
              <div className="space-y-4">
                {Object.entries(stats.moduleCompletions).map(([moduleId, count]: [string, any]) => (
                  <div key={moduleId} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <span className="font-bold">{moduleId}</span>
                        <span className="font-bold">
                          {count} / {stats.totalUsers} users
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 h-3 border-2 border-black">
                        <div
                          className="bg-black h-full transition-all"
                          style={{
                            width: `${(count / stats.totalUsers) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white border-4 border-black">
            <div className="p-6 border-b-4 border-black">
              <h2 className="text-3xl font-black">All Users</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b-4 border-black">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold">Name</th>
                    <th className="px-6 py-4 text-left font-bold">Email</th>
                    <th className="px-6 py-4 text-left font-bold">Enrolled</th>
                    <th className="px-6 py-4 text-left font-bold">Progress</th>
                    <th className="px-6 py-4 text-left font-bold">Role</th>
                    <th className="px-6 py-4 text-left font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr
                      key={user.id}
                      className={`${
                        index % 2 === 0 ? "bg-white" : "bg-neutral-50"
                      } border-b-2 border-black`}
                    >
                      <td className="px-6 py-4 font-medium">{user.name}</td>
                      <td className="px-6 py-4 text-neutral-600">{user.email}</td>
                      <td className="px-6 py-4 text-neutral-600">
                        {new Date(user.enrolledAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-neutral-200 h-2 border border-black">
                            <div
                              className="bg-black h-full"
                              style={{
                                width: `${
                                  ((user.completedModules?.length || 0) / 7) * 100
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-bold">
                            {user.completedModules?.length || 0}/7
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.isAdmin ? (
                          <span className="bg-black text-white px-3 py-1 text-sm font-bold">
                            ADMIN
                          </span>
                        ) : (
                          <span className="bg-neutral-200 px-3 py-1 text-sm font-bold">
                            STUDENT
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleAdmin(user.id)}
                          disabled={user.id === currentUser?.id}
                          className="border-2 border-black px-4 py-2 text-sm font-bold hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <Shield className="w-4 h-4" />
                          {user.isAdmin ? "Remove Admin" : "Make Admin"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Users */}
          {stats?.recentUsers && (
            <div className="mt-12 bg-neutral-50 border-4 border-black p-6">
              <h2 className="text-3xl font-black mb-6">Recent Sign-ups</h2>
              <div className="space-y-3">
                {stats.recentUsers.map((user: any) => (
                  <div
                    key={user.id}
                    className="bg-white border-2 border-black p-4 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold">{user.name}</p>
                      <p className="text-sm text-neutral-600">{user.email}</p>
                    </div>
                    <p className="text-sm text-neutral-600">
                      {new Date(user.enrolledAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
