import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { useAuth } from "../../../contexts/auth";
import { Navbar } from "../../components/layouts/navbar";
import { Footer } from "../../components/layouts/footer";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c`;

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const [status, setStatus] = useState<"polling" | "complete" | "error">("polling");
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    if (!sessionId) { setStatus("error"); return; }

    let attempts = 0;
    const poll = async () => {
      try {
        const res = await fetch(`${API}/checkout/status?session=${sessionId}`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        const data = await res.json();

        if (data.status === "complete" && data.token && data.user) {
          localStorage.setItem("access_token", data.token);
          setUser(data.user);
          setStatus("complete");
          setTimeout(() => navigate("/student/dashboard"), 2000);
          return;
        }

        if (data.status === "not_found" || data.status === "expired") {
          setStatus("error");
          return;
        }

        // Still pending — retry up to 30 times (60 seconds)
        attempts++;
        if (attempts < 30) setTimeout(poll, 2000);
        else setStatus("error");
      } catch {
        attempts++;
        if (attempts < 30) setTimeout(poll, 2000);
        else setStatus("error");
      }
    };

    poll();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-32 pb-20 px-6 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          {status === "polling" && (
            <div>
              <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h1 className="text-4xl font-black tracking-tight mb-3">Setting Up Your Account</h1>
              <p className="text-neutral-500">Payment confirmed. Creating your account now...</p>
            </div>
          )}

          {status === "complete" && (
            <div>
              <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-4xl font-black tracking-tight mb-3">You're In.</h1>
              <p className="text-neutral-500">Redirecting you to your dashboard...</p>
            </div>
          )}

          {status === "error" && (
            <div>
              <h1 className="text-4xl font-black tracking-tight mb-3">Something Went Wrong</h1>
              <p className="text-neutral-500 mb-8">
                Your payment was received but we had trouble setting up your account. Email us and we'll sort it out immediately.
              </p>
              <a
                href="mailto:support@mayberrylaundromat.com"
                className="inline-block bg-black text-white px-8 py-4 font-bold hover:bg-neutral-800 transition-colors"
              >
                CONTACT SUPPORT
              </a>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
