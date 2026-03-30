import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { Navbar } from "../../components/layouts/navbar";
import { Footer } from "../../components/layouts/footer";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../contexts/auth";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Login using our custom session-based auth
      const loginResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email, password }),
        }
      );

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json().catch(() => ({}));
        console.error("[Login] Login failed:", errorData);

        if (loginResponse.status === 401) {
          setError("Invalid email or password.");
        } else {
          setError(errorData.error || "Login failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      const { token, user } = await loginResponse.json();

      if (!token || !user) {
        setError("Invalid response from server");
        setLoading(false);
        return;
      }

      // Store the session token and update auth context
      localStorage.setItem("access_token", token);
      setUser(user);

      if (user.isAdmin) {
        toast.success("Logged in as Admin!");
        navigate("/admin/dashboard");
      } else {
        toast.success("Logged in as Student!");
        navigate("/student/dashboard");
      }
    } catch (err) {
      console.error("[Login] Unexpected error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-black tracking-tight mb-4">
              Welcome Back
            </h1>
            <p className="text-lg text-neutral-600">
              Sign in to access your course
            </p>
          </div>

          <div className="bg-neutral-50 border-2 border-black p-8">
            <form onSubmit={handleLogin}>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-bold mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div className="mb-6 relative">
                <label htmlFor="password" className="block text-sm font-bold mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-3 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white px-8 py-4 text-lg font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing In..." : "SIGN IN"}
              </button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <div>
                <Link to="/forgot-password" className="text-sm font-bold underline text-neutral-500 hover:text-black transition-colors">
                  Forgot your password?
                </Link>
              </div>
              <p className="text-neutral-600">
                Don't have an account?{" "}
                <Link to="/signup" className="font-bold underline">
                  Sign Up
                </Link>
              </p>
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </div>
  );
}
