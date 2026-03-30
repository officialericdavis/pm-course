import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/layouts/admin-layout";
import { Search, Filter, ShieldCheck, ShieldOff, Eye, EyeOff, X } from "lucide-react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { toast } from "sonner";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c`;

export function AdminStudents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Role change modal state
  const [modalUser, setModalUser] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) { toast.error("Not authenticated"); setLoading(false); return; }
      const response = await fetch(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Failed to fetch students");
      const data = await response.json();
      setStudents(data.users || []);
      setLoading(false);
    } catch (err) {
      toast.error("Failed to load students");
      setLoading(false);
    }
  };

  const openModal = (student: any) => {
    setModalUser(student);
    setPassword("");
    setShowPassword(false);
  };

  const closeModal = () => {
    setModalUser(null);
    setPassword("");
  };

  const handleToggleAdmin = async () => {
    if (!password.trim()) { toast.error("Enter your password"); return; }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/admin/toggle-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: modalUser.id, password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to change role"); setSubmitting(false); return; }
      setStudents(prev => prev.map(s => s.id === modalUser.id ? { ...s, isAdmin: data.user.isAdmin } : s));
      toast.success(`${modalUser.name} is now ${data.user.isAdmin ? "an Admin" : "a Student"}`);
      closeModal();
    } catch {
      toast.error("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-black">Students</h1>
          <button className="bg-black text-white px-6 py-2 font-bold hover:bg-neutral-800">
            EXPORT DATA
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <button className="px-6 py-3 border-2 border-black font-bold hover:bg-black hover:text-white transition-colors flex items-center gap-2">
            <Filter size={20} />
            FILTERS
          </button>
        </div>

        {/* Students Table */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-xl text-neutral-600">Loading students...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-neutral-600">No students found</p>
          </div>
        ) : (
          <div className="bg-white border-2 border-black overflow-hidden">
            <table className="w-full">
              <thead className="bg-black text-white">
                <tr>
                  <th className="text-left p-4 font-bold">Name</th>
                  <th className="text-left p-4 font-bold">Email</th>
                  <th className="text-center p-4 font-bold">Role</th>
                  <th className="text-center p-4 font-bold">Modules Completed</th>
                  <th className="text-left p-4 font-bold">Enrolled Date</th>
                  <th className="text-center p-4 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr
                    key={student.id}
                    className={`border-b border-neutral-200 ${index % 2 === 0 ? "bg-white" : "bg-neutral-50"}`}
                  >
                    <td className="p-4 font-bold">{student.name}</td>
                    <td className="p-4 text-neutral-600">{student.email}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 text-xs font-bold ${student.isAdmin ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                        {student.isAdmin ? "Admin" : "Student"}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-center">{student.completedModules?.length || 0}</td>
                    <td className="p-4 text-neutral-600">
                      {student.enrolledAt ? new Date(student.enrolledAt).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => openModal(student)}
                        title={student.isAdmin ? "Revoke Admin" : "Make Admin"}
                        className="inline-flex items-center gap-1 px-3 py-1 border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors"
                      >
                        {student.isAdmin ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                        {student.isAdmin ? "Revoke Admin" : "Make Admin"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {modalUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-white border-2 border-black p-8 w-full max-w-sm relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-neutral-400 hover:text-black">
              <X size={20} />
            </button>
            <h2 className="text-2xl font-black mb-1">
              {modalUser.isAdmin ? "Revoke Admin" : "Make Admin"}
            </h2>
            <p className="text-sm text-neutral-600 mb-6">
              {modalUser.isAdmin
                ? `Remove admin access from ${modalUser.name}?`
                : `Grant admin access to ${modalUser.name}?`}
            </p>

            <label className="block text-sm font-bold mb-2">Your Password</label>
            <div className="relative mb-6">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleToggleAdmin()}
                placeholder="Enter your site password"
                className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-black"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 border-2 border-black py-3 font-bold hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleAdmin}
                disabled={submitting || !password.trim()}
                className={`flex-1 py-3 font-bold text-white transition-colors disabled:opacity-40 ${modalUser.isAdmin ? "bg-red-600 hover:bg-red-700" : "bg-black hover:bg-neutral-800"}`}
              >
                {submitting ? "Verifying..." : modalUser.isAdmin ? "Revoke Admin" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
