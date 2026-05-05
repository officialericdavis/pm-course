import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { Navbar } from "../../components/layouts/navbar";
import { Footer } from "../../components/layouts/footer";
import { Eye, EyeOff, Tag, CheckCircle, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../contexts/auth";
import { useSettings } from "../../../../hooks/use-settings";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c`;

export function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discountType: string; discountValue: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) sessionStorage.setItem("campaign_ref", ref);
  }, []);
  const basePrice = parseFloat(String(settings?.coursePrice ?? "$389").replace(/[^0-9.]/g, "")) || 389;
  const displayPrice = (() => {
    if (!coupon) return settings?.coursePrice ?? "$389";
    if (coupon.discountType === "free") return "FREE";
    if (coupon.discountType === "percent") return `$${(basePrice * (1 - coupon.discountValue / 100)).toFixed(0)}`;
    if (coupon.discountType === "fixed") return `$${Math.max(0, basePrice - coupon.discountValue).toFixed(0)}`;
    return settings?.coursePrice ?? "$389";
  })();

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    setCoupon(null);
    try {
      const res = await fetch(`${API}/validate-coupon`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ code: couponInput.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setCoupon(data.coupon);
      } else {
        setCouponError(data.error || "Invalid coupon code");
      }
    } catch {
      setCouponError("Could not validate coupon. Try again.");
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  const isFree = coupon?.discountType === "free";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Free coupon → direct signup
      if (isFree) {
        const res = await fetch(`${API}/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ email, password, name, couponCode: coupon!.code, campaignRef: sessionStorage.getItem("campaign_ref") || null }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Sign up failed."); setLoading(false); return; }
        localStorage.setItem("access_token", data.token);
        setUser(data.user);
        toast.success("Account created! Welcome!");
        navigate(data.user?.isAdmin ? "/admin/dashboard" : "/student/dashboard");
        return;
      }

      // Paid or discounted → Stripe checkout
      const res = await fetch(`${API}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ email, password, name, couponCode: coupon?.code ?? null, campaignRef: sessionStorage.getItem("campaign_ref") || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not start checkout."); setLoading(false); return; }
      window.location.href = data.url;
    } catch {
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
            <h1 className="text-5xl font-black tracking-tight mb-4">Get Started</h1>
            <p className="text-lg text-neutral-600">Create your account to access the course</p>
          </div>

          <div className="bg-neutral-50 border-2 border-black p-8">
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              <div className="mb-6">
                <label htmlFor="name" className="block text-sm font-bold mb-2">Full Name</label>
                <input
                  id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="John Doe" required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-bold mb-2">Email Address</label>
                <input
                  id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="your@email.com" required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="password" className="block text-sm font-bold mb-2">Password</label>
                <div className="relative">
                  <input
                    id="password" type={showPassword ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="At least 6 characters" minLength={6} required
                  />
                  <button type="button" className="absolute top-1/2 right-3 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="text-xs text-neutral-600 mt-2">Must be at least 6 characters</p>
              </div>

              {/* Coupon */}
              <div className="mb-6">
                {coupon ? (
                  <div className={`flex items-center justify-between p-3 border-2 ${isFree ? "border-green-500 bg-green-50" : "border-black bg-neutral-50"}`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className={isFree ? "text-green-600" : "text-black"} />
                      <span className="font-bold text-sm">{coupon.code}</span>
                      <span className="text-sm text-neutral-600">
                        {isFree ? "— Free access!" : coupon.discountType === "percent" ? `— ${coupon.discountValue}% off` : `— $${coupon.discountValue} off`}
                      </span>
                    </div>
                    <button type="button" onClick={removeCoupon} className="text-neutral-400 hover:text-black transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowCoupon(!showCoupon)}
                      className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      <Tag size={12} />
                      Have a coupon code?
                      <ChevronDown size={12} className={`transition-transform ${showCoupon ? "rotate-180" : ""}`} />
                    </button>
                    {showCoupon && (
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyCoupon())}
                          className="flex-1 px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black uppercase placeholder:normal-case"
                          placeholder="Enter code"
                        />
                        <button
                          type="button" onClick={handleApplyCoupon} disabled={couponLoading || !couponInput.trim()}
                          className="px-4 py-3 border-2 border-black font-bold text-sm hover:bg-black hover:text-white transition-colors disabled:opacity-40 flex items-center gap-2"
                        >
                          <Tag size={14} />
                          {couponLoading ? "..." : "Apply"}
                        </button>
                      </div>
                    )}
                  </>
                )}
                {couponError && <p className="text-red-600 text-xs mt-1">{couponError}</p>}
              </div>

              <div className="mb-4 text-center">
                <p className="text-sm text-neutral-500">Total due today</p>
                {/* <p className="text-3xl font-black">{displayPrice}</p> */}
                <p className="text-3xl font-black">$389</p>

              </div>

              <button
                type="submit" disabled={loading}
                className="w-full bg-black text-white px-8 py-4 text-lg font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* {loading ? "Please wait..." : isFree ? "CREATE ACCOUNT — FREE" : `CONTINUE TO CHECKOUT — ${displayPrice}`} */}
                {loading ? "Please wait..." : isFree ? "CREATE ACCOUNT — FREE" : `CONTINUE TO CHECKOUT — $389`}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-neutral-600">
                Already have an account?{" "}
                <Link to="/login" className="font-bold underline">Sign In</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
