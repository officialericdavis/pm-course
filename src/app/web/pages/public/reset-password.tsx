import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { Navbar } from "../../components/layouts/navbar";
import { Footer } from "../../components/layouts/footer";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (!token) { setError("Invalid reset link. Please request a new one."); return; }

    setLoading(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ token, password }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        toast.success("Password reset! Please sign in.");
        navigate("/login");
      } else {
        setError(data.error || "Failed to reset password. The link may have expired.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-32 pb-20 px-6">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-4xl font-black mb-4">Invalid Link</h1>
            <p className="text-neutral-600 mb-6">This reset link is invalid or has expired.</p>
            <Link to="/forgot-password" className="bg-black text-white px-8 py-4 font-bold hover:bg-neutral-800 transition-colors inline-block">
              REQUEST NEW LINK
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-black tracking-tight mb-4">Reset Password</h1>
            <p className="text-lg text-neutral-600">Choose a new password for your account.</p>
          </div>

          <div className="bg-neutral-50 border-2 border-black p-8">
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              <div className="mb-6">
                <label htmlFor="password" className="block text-sm font-bold mb-2">New Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="Min. 6 characters"
                    required
                  />
                  <button type="button" className="absolute top-1/2 right-3 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="confirm" className="block text-sm font-bold mb-2">Confirm Password</label>
                <input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Re-enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white px-8 py-4 text-lg font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Resetting..." : "SET NEW PASSWORD"}
              </button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm font-bold underline text-neutral-600">Back to Sign In</Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
