import { Link } from "react-router";
import { Navbar } from "../../components/layouts/navbar";
import { Footer } from "../../components/layouts/footer";
import { ArrowRight, CheckCircle, X } from "lucide-react";
import { ImageWithFallback } from "../../../shared/figma/ImageWithFallback";
import peterMayberryImage from "/src/assets/peter-mayberry.png";
import { useSettings } from "../../../../hooks/use-settings";
import { useEffect, useRef, useState } from "react";
import { projectId } from "/utils/supabase/info";
import { supabase } from "/utils/supabase/client";

const TRACK = `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/track`;
const STRIPE_PRICE_ID = "price_1TSelSAZNpuUqk5vk1vE9KfC";

function getSessionId(): string {
  let id = sessionStorage.getItem("_sid");
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem("_sid", id); }
  return id;
}

function beacon(url: string, payload: object) {
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, blob);
  } else {
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true }).catch(() => {});
  }
}

function trackVisit(page: string) {
  beacon(`${TRACK}/visit`, { sessionId: getSessionId(), page });
}

function trackSection(section: string) {
  beacon(`${TRACK}/section`, { sessionId: getSessionId(), section });
}

function trackCta(ctaId: string) {
  beacon(`${TRACK}/cta`, { sessionId: getSessionId(), ctaId });
}

async function redirectToCheckout() {
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: {
      priceId: STRIPE_PRICE_ID,
      successUrl: `${window.location.origin}/checkout/success`,
      cancelUrl: `${window.location.origin}/checkout/cancel`,
    },
  });
  if (error) throw error;
  window.location.href = data.url;
}

export function LandingPage() {
  const { settings } = useSettings();
  const coursePrice = settings?.coursePrice ?? "$389";
  const [loading, setLoading] = useState(false);

  const heroRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLElement>(null);
  const problemRef = useRef<HTMLElement>(null);
  const howItWorksRef = useRef<HTMLElement>(null);
  const courseRef = useRef<HTMLElement>(null);
  const socialProofRef = useRef<HTMLElement>(null);
  const personalityRef = useRef<HTMLElement>(null);
  const pricingRef = useRef<HTMLElement>(null);
  const finalCtaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    trackVisit("landing");
    const fired = new Set<string>();
    const sections: [React.RefObject<HTMLElement | null>, string][] = [
      [heroRef, "hero"], [aboutRef, "about"], [problemRef, "problem"],
      [howItWorksRef, "how-it-works"], [courseRef, "course"], [socialProofRef, "social-proof"],
      [personalityRef, "personality-filter"], [pricingRef, "pricing"], [finalCtaRef, "final-cta"],
    ];
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const section = sections.find(([ref]) => ref.current === entry.target)?.[1];
          if (section && !fired.has(section)) { fired.add(section); trackSection(section); }
        }
      }
    }, { threshold: 0.2 });
    sections.forEach(([ref]) => { if (ref.current) observer.observe(ref.current); });
    return () => observer.disconnect();
  }, []);

  async function handleBuy(ctaId: string) {
    trackCta(ctaId);
    setLoading(true);
    try {
      await redirectToCheckout();
    } catch (e) {
      console.error(e);
      alert("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section ref={heroRef} className="pt-32 pb-12 px-3 sm:px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight mb-2 md:mb-6 leading-none md:leading-[1.1]">
            I Build Laundromats.
          </h1>
          <h2 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight mb-4 md:mb-6 leading-none md:leading-[1.1]">
            No Bullshit.
          </h2>
          <p className="text-xl sm:text-xl md:text-2xl text-neutral-600 mb-2 md:mb-3 px-2">
            I'm Peter Mayberry. I build cash-flowing laundromats.
          </p>
          <p className="text-xl sm:text-xl md:text-2xl text-neutral-600 mb-6 md:mb-8 px-2">
            No fluff. Just what actually works.
          </p>
          <div className="flex flex-row gap-2 md:gap-4 justify-center items-center px-2">
            <button
              onClick={() => handleBuy("hero-start")}
              disabled={loading}
              className="wiggle bg-black text-white px-4 md:px-10 py-3 md:py-5 text-xs md:text-lg font-bold hover:bg-neutral-800 transition-colors flex items-center gap-1 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "REDIRECTING..." : "START THE COURSE"}
              <ArrowRight className="w-3 md:w-5 h-3 md:h-5" />
            </button>
            <a
              href="#how-it-works"
              onClick={() => trackCta("hero-how-it-works")}
              className="border-2 border-black px-4 md:px-10 py-3 md:py-5 text-xs md:text-lg font-bold hover:bg-black hover:text-white transition-colors whitespace-nowrap"
            >
              SEE HOW IT WORKS
            </a>
          </div>
        </div>
      </section>

      {/* Authority Section */}
      <section ref={aboutRef} id="about" className="pt-0 pb-6 px-6 bg-neutral-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-[1fr_1.2fr] gap-6 md:gap-12 items-center">
          <div>
            <ImageWithFallback
              src={peterMayberryImage}
              alt="Peter Mayberry"
              className="w-full h-[300px] sm:h-[400px] md:h-[600px] object-cover grayscale"
            />
          </div>
          <div>
            <h2 className="font-black tracking-tight mb-4 md:mb-6 text-[24px] md:text-[40px]">I built my first laundromat with $105,000.</h2>
            <p className="text-base sm:text-lg text-neutral-700 mb-3 md:mb-4">No rich parents. Just me and a willingness to figure shit out.</p>
            <p className="text-base sm:text-lg text-neutral-700 mb-3 md:mb-4">That first location was all me. I've scaled to 12+ locations in 8 years. Now they run without me.</p>
            <p className="text-base sm:text-lg text-neutral-700 mb-3 md:mb-4"><strong>Laundromats are just water, gas, and electricity. That's exactly why they work.</strong></p>
            <p className="text-base sm:text-lg text-neutral-700 mb-4 md:mb-6">Why did I pick laundromats? Recession-resistant. Low maintenance. High cash flow.</p>
            <p className="text-base sm:text-lg font-bold">I'm not here to sell you a dream. I'm here to show you exactly how I did it — so you can try to do it too.</p>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section ref={problemRef} className="py-12 md:py-20 px-4 md:px-6 bg-black text-white">
        <style>{`
          @keyframes fail-wiggle {
            0%, 100% { transform: translateX(0) rotate(0deg); }
            20% { transform: translateX(-3px) rotate(-1.5deg); }
            50% { transform: translateX(3px) rotate(1.5deg); }
            80% { transform: translateX(-2px) rotate(-0.5deg); }
          }
          .fail-wiggle { display: inline-block; animation: fail-wiggle 2.5s ease-in-out infinite; }
        `}</style>
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-6xl font-black tracking-tight mb-6 md:mb-10 text-center">
            Why most people <span className="fail-wiggle text-[#ff0000]">fail</span> at laundromats?
          </h2>
          <div className="space-y-4 md:space-y-6">
            {[
              { n: "01", title: <>They <span className="text-[#ff0000]">overpay</span> for locations</>, body: "Bad deals kill cash flow before you start. Know exactly what to pay and how to negotiate." },
              { n: "02", title: <>They <span className="text-[#ff0000]">underestimate</span> operating costs</>, body: "Utilities, maintenance, repairs — without real numbers you'll bleed out quietly." },
              { n: "03", title: <>They <span className="text-[#ff0000]">pick</span> terrible locations</>, body: "Demographics and traffic patterns decide your revenue. Your gut feeling doesn't." },
              { n: "04", title: <>They have <span className="text-[#ff0000]">no</span> systems</>, body: "Machines break, customers complain. Without systems you work in the business forever." },
              { n: "05", title: <>They <span className="text-[#ff0000]">quit</span> when it gets hard</>, body: "The first 90 days are rough. Push through and you'll print cash for years." },
            ].map(({ n, title, body }) => (
              <div key={n} className="bg-neutral-900 p-4 md:p-6 border-l-4 md:border-l-8 border-white">
                <div className="flex items-center gap-3 md:gap-6">
                  <div className="text-3xl md:text-5xl font-black text-neutral-600">{n}</div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3">{title}</h3>
                    <p className="text-sm md:text-base text-neutral-300">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section ref={howItWorksRef} id="how-it-works" className="py-20 px-6">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 md:mb-6 text-black">
              The Mayberry Method
            </h2>
            <p className="text-base md:text-xl text-neutral-600 max-w-2xl mx-auto">A proven 5-step framework for finding, buying, and scaling profitable laundromats that work.</p>
          </div>
          <div className="space-y-4 md:space-y-6">
            {[
              { n: "01", title: "Find the Right Location", body: "Learn my exact criteria for evaluating markets and locations. Data-driven decision making that eliminates guesswork." },
              { n: "02", title: "Secure the Deal", body: "Negotiation tactics, financing strategies, and legal frameworks that protect you and maximize profit potential." },
              { n: "03", title: "Set Up for Success", body: "Equipment selection, layout optimization, and vendor relationships that reduce costs and increase revenue." },
              { n: "04", title: "Run Lean Operations", body: "Systems for maintenance, customer service, and cash flow management. Build a business that runs itself." },
              { n: "05", title: "Scale Your Empire", body: "Once one location is profitable, replicate the formula. Turn one laundromat into a portfolio of cash-flowing assets." },
            ].map(({ n, title, body }) => (
              <div key={n} className="bg-neutral-50 p-4 md:p-6 border-l-4 md:border-l-8 border-black">
                <div className="flex items-center gap-3 md:gap-6">
                  <div className="text-3xl md:text-5xl font-black text-black">{n}</div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3">{title}</h3>
                    <p className="text-sm md:text-base text-neutral-700">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Course Section */}
      <section ref={courseRef} id="course" className="py-20 px-6 text-white relative" style={{backgroundColor: "#000000"}}>
        <div className="absolute inset-0 pointer-events-none" style={{opacity: 0.12, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cdefs%3E%3Cpattern id='smallGrid' width='10' height='10' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 10' fill='none' stroke='%23ffffff' stroke-width='0.5'/%3E%3C/pattern%3E%3Cpattern id='grid' width='80' height='80' patternUnits='userSpaceOnUse'%3E%3Crect width='80' height='80' fill='url(%23smallGrid)'/%3E%3Cpath d='M 80 0 L 0 0 0 80' fill='none' stroke='%23ffffff' stroke-width='1.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`}}></div>
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-black tracking-tight mb-6">
              The Laundromat Blueprint
            </h2>
            <p className="text-xl text-neutral-300 max-w-3xl mx-auto">Everything you need to find, buy, operate and scale a cash-flowing laundromat business from scratch.</p>
          </div>

          <div className="bg-white text-black p-10 my-12">
            <h3 className="text-3xl font-bold mb-8">What's Included:</h3>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {[
                { title: "40+ Video Modules", sub: "Complete A-Z training system" },
                { title: "Location Analysis Tools", sub: "My exact evaluation spreadsheets" },
                { title: "Deal Calculator", sub: "Know if a deal makes sense instantly" },
                { title: "Contract Templates", sub: "Lease agreements & vendor contracts" },
                { title: "Operations Manual", sub: "Step-by-step SOPs" },
                { title: "Vendor Contact List", sub: "Trusted suppliers & contractors" },
              ].map(({ title, sub }) => (
                <div key={title} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-bold">{title}</p>
                    <p className="text-neutral-600">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-neutral-200 pt-8">
              <h3 className="text-3xl font-bold mb-6">What You'll Achieve:</h3>
              <ul className="space-y-3">
                {[
                  "Find and evaluate profitable laundromat opportunities in your area",
                  "Negotiate deals that make financial sense from day one",
                  "Set up operations that run smoothly with minimal intervention",
                  "Build a cash-flowing asset that generates passive income",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <ArrowRight className="w-5 h-5 flex-shrink-0" />
                    <span className="text-lg">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex justify-center w-full mt-20 mb-0">
            <button
              onClick={() => handleBuy("course-enroll-now")}
              disabled={loading}
              className="bg-white text-black px-12 py-6 text-xl font-bold hover:bg-neutral-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "REDIRECTING..." : "ENROLL NOW"}
            </button>
          </div>
        </div>
      </section>

      {/* Personality Filter Section */}
      <section ref={personalityRef} className="py-20 px-6 bg-neutral-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-black tracking-tight mb-12 text-center">
            This is <span className="text-[#ff0000]">NOT</span> for everyone
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <CheckCircle className="w-8 h-8" />
                This IS for you if:
              </h3>
              <ul className="space-y-4">
                {[
                  "You have real capital and balls to invest (or can get financing)",
                  "You want a real business, not a side hustle",
                  "You're willing to do the work upfront for long-term payoff",
                  "You want passive income that actually works",
                  "You can follow a proven system",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 md:border-l-4 md:border-black md:pl-4">
                    <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0 md:hidden"></div>
                    <span className="text-lg">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <X className="w-8 h-8" />
                This is NOT for you if:
              </h3>
              <ul className="space-y-4">
                {[
                  "You think you'll get rich overnight",
                  "You have zero capital and no plan to get it",
                  "You want a \"passive\" business without doing work",
                  "You need hand-holding every step of the way",
                  "You're not serious about building real wealth",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 md:border-l-4 md:border-neutral-400 md:pl-4">
                    <div className="w-2 h-2 bg-neutral-400 rounded-full mt-2 flex-shrink-0 md:hidden"></div>
                    <span className="text-lg text-neutral-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section ref={pricingRef} className="py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-black tracking-tight mb-6">Simple Pricing</h2>
            <p className="text-xl text-neutral-600">One payment. Lifetime access. No upsells.</p>
          </div>

          <div className="bg-black text-white p-12 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-2">
              <p className="font-bold text-sm">LIMITED TIME OFFER</p>
            </div>

            <div className="text-center mb-8">
              {/* <p className="text-6xl font-black mb-4">{coursePrice}</p> */}
              <p className="text-6xl font-black mb-4">$389</p>
              <p className="text-lg text-neutral-300">One-time payment</p>
            </div>

            <div className="border-t border-neutral-700 pt-8 mb-8">
              <h3 className="text-xl font-bold mb-4">Everything Included:</h3>
              <ul className="space-y-3">
                {[
                  "Complete Laundromat Blueprint Course",
                  "40+ Video Lessons & Frameworks",
                  "All Templates, Spreadsheets & Contracts",
                  "Lifetime Access + Future Updates",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleBuy("pricing-start-now")}
              disabled={loading}
              className="block w-full bg-white text-black text-center px-8 py-5 text-xl font-bold hover:bg-neutral-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "REDIRECTING..." : "START NOW"}
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section ref={finalCtaRef} className="py-20 px-6 bg-black text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-8">
            You can keep dreaming.
            <br />
            Or you can start building.
          </h2>
          <p className="text-2xl text-neutral-300 mb-12">The choice is yours.</p>
          <button
            onClick={() => handleBuy("final-cta-start")}
            disabled={loading}
            className="inline-block bg-white text-black px-12 py-6 text-xl font-bold hover:bg-neutral-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "REDIRECTING..." : "START YOUR LAUNDROMAT BUSINESS"}
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}