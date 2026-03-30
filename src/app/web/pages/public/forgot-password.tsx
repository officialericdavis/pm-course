import { useState } from "react";
import { Link } from "react-router";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { Navbar } from "../../components/layouts/navbar";
import { Footer } from "../../components/layouts/footer";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ email }),
        }
      );
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-black tracking-tight mb-4">Forgot Password</h1>
            <p className="text-lg text-neutral-600">Enter your email and we'll send you a reset link.</p>
          </div>

          <div className="bg-neutral-50 border-2 border-black p-8">
            {sent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-black flex items-center justify-center mx-auto mb-5">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black mb-3">Check your email</h2>
                <p className="text-neutral-600 mb-6">
                  If <span className="font-bold">{email}</span> has an account, you'll receive a reset link within a few minutes.
                </p>
                <p className="text-sm text-neutral-400 mb-6">Didn't get it? Check your spam folder.</p>
                <Link to="/login" className="text-sm font-bold underline">Back to Sign In</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                    <p className="text-red-700">{error}</p>
                  </div>
                )}
                <div className="mb-6">
                  <label htmlFor="email" className="block text-sm font-bold mb-2">Email Address</label>
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white px-8 py-4 text-lg font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "SEND RESET LINK"}
                </button>
              </form>
            )}
          </div>

          {!sent && (
            <div className="mt-6 text-center">
              <Link to="/login" className="text-sm font-bold underline text-neutral-600">Back to Sign In</Link>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
