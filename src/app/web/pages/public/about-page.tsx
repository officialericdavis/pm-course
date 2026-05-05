import { Link } from "react-router";
import { Navbar } from "../../components/layouts/navbar";
import { Footer } from "../../components/layouts/footer";
import { ArrowRight } from "lucide-react";
import { ImageWithFallback } from "../../../shared/figma/ImageWithFallback";
import peterMayberryImage from "/src/assets/peter-mayberry.png";
import peterMayberryImage2 from "/src/assets/IMG_8096.jpg";

const STATS = [
  { value: "12+", label: "Locations Owned" },
  { value: "8", label: "Years in the Game" },
  { value: "$105,000", label: "First Deal Size" },
  { value: "7-Fig", label: "Portfolio Value" },
];

const TIMELINE = [
  { year: "20XX", title: "Started from Zero", body: "No background in real estate, no rich family. Just a willingness to figure things out and a conviction that laundromats were undervalued." },
  { year: "20XX", title: "First Location", body: "Closed my first deal for $105,000. Spent a year learning the hard way — equipment failures, operational headaches, the real cost of utilities. Figured it all out." },
  { year: "20XX", title: "Proved the Model", body: "First location hit consistent cash flow. Realized everything I learned the hard way was repeatable. Started documenting the playbook." },
  { year: "20XX", title: "Scaled to 5 Locations", body: "Used the same framework across 5 locations. Each one easier than the last. The systems I built meant I wasn't on-site anymore — I was running a business." },
  { year: "20XX", title: "12+ Locations", body: "Expanded across multiple markets. The portfolio runs without me. Now I spend my time teaching others the exact system that got me here." },
];

const VALUES = [
  { title: "No Fluff", body: "I don't sell dreams. I give you the real numbers, the real problems, and the real solutions. If a deal doesn't make financial sense, I'll tell you to walk." },
  { title: "Cash Flow First", body: "Appreciation is a bonus. A business that doesn't cash flow isn't a business — it's a liability. Every decision I make starts with the cash flow math." },
  { title: "Systems Over Hustle", body: "Working 80-hour weeks at your own business is just a job with no boss. The goal is to build systems that run without you — and actually get there." },
  { title: "Real Assets Only", body: "Laundromats are water, gas, and electricity. People will always need clean clothes. That simplicity is exactly why they print cash in recessions and bull markets." },
];

export function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-0 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm font-bold tracking-widest text-neutral-400 uppercase mb-4">About Peter Mayberry</p>
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight leading-none mb-6">
            I figured it out.<br />
            <span className="text-[#ff0000]">The hard way.</span>
          </h1>
          <p className="text-xl md:text-2xl text-neutral-600 max-w-3xl">
            12+ laundromats. 8 years. One playbook. Here's the full story.
          </p>
        </div>
      </section>

      {/* Photo + Origin Story */}
      <section className="py-12 md:py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-[1fr_1.3fr] gap-10 md:gap-16 items-center">
          <div>
            <ImageWithFallback src={peterMayberryImage2} alt="Peter Mayberry" className="w-full h-[320px] sm:h-[440px] md:h-[600px] object-cover grayscale" />
          </div>
          <div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">Where I came from?</h2>
            <p className="text-lg text-neutral-700 mb-4">I grew up on the Winnebago Indian Reservation, graduated from Homer High School, and earned my degree at the University of Nebraska Kearney. After a management training program at Eaton, I joined General Electric in Omaha — rising to Area Manager and becoming one of GE's top salespeople.</p>
            <p className="text-lg text-neutral-700 mb-4 italic font-bold">"You are a product of the people you surround yourself with."</p>
            <p className="text-lg text-neutral-700 mb-4">Working alongside business owners shifted my focus. I saw an opportunity in laundromats, bought a run-down former dry cleaner that even my banker doubted — and turned it into something no one expected.</p>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-black text-white py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-neutral-700">
          {STATS.map((s) => (
            <div key={s.label} className="text-center px-6 py-4">
              <p className="text-3xl md:text-4xl font-black text-green-500 mb-1 break-words">{s.value}</p>
              <p className="text-sm text-neutral-400 font-bold uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 md:py-24 px-6 bg-neutral-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-12">The Journey</h2>
          <div className="relative">
            <div className="absolute left-[52px] top-0 bottom-0 w-0.5 bg-neutral-300 hidden md:block" />
            <div className="space-y-10">
              {TIMELINE.map((item, i) => (
                <div key={i} className="flex gap-6 md:gap-10 items-start">
                  <div className="shrink-0 w-[52px] text-right hidden md:block">
                    <span className="text-xs font-black text-neutral-400 bg-neutral-50 relative z-10 py-1">{item.year}</span>
                  </div>
                  <div className="hidden md:flex shrink-0 w-4 h-4 rounded-full bg-black border-4 border-neutral-50 mt-1 relative z-10 -ml-2" />
                  <div className="flex-1 bg-white border-2 border-black p-5 md:p-6">
                    <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-1 md:hidden">{item.year}</p>
                    <h3 className="text-xl font-black mb-2">{item.title}</h3>
                    <p className="text-neutral-600">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-16 md:py-24 px-6 bg-black text-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-4">What I believe</h2>
          <p className="text-xl text-neutral-400 mb-12 max-w-2xl">These aren't talking points. They're the principles I've built every location on.</p>
          <div className="grid md:grid-cols-2 gap-6">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-neutral-900 border-l-4 border-white p-6 md:p-8">
                <h3 className="text-2xl font-black mb-3">{v.title}</h3>
                <p className="text-neutral-300">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Personal */}
      <section className="py-16 md:py-24 px-6 bg-neutral-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-8">Outside the business</h2>
          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            <div>
              <p className="text-lg text-neutral-700 mb-4">[Something personal — family, where you live, hobbies, what drives you outside of work.]</p>
              <p className="text-lg text-neutral-700 mb-4">[What you care about beyond money — community, mentorship, legacy.]</p>
              <p className="text-lg text-neutral-700">[Why you started teaching — what made you want to share the playbook?]</p>
            </div>
            <div className="space-y-4">
              {[
                { label: "Based in", value: "[Your City, State]" },
                { label: "Interests", value: "[e.g. Real estate, fitness, family]" },
                { label: "Currently building", value: "[Current project or focus]" },
                { label: "Favorite deal", value: "[Brief description of your best deal]" },
              ].map((item) => (
                <div key={item.label} className="flex gap-4 items-start border-b border-neutral-200 pb-4">
                  <p className="text-sm font-black text-neutral-400 uppercase tracking-wide w-32 shrink-0 pt-0.5">{item.label}</p>
                  <p className="text-neutral-700 font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-black text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6">Ready to learn from someone who's actually done it?</h2>
          <p className="text-xl text-neutral-300 mb-10 max-w-2xl mx-auto">No theory. No gurus. Just the exact playbook I used to build 12+ cash-flowing locations.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login" className="bg-white text-black px-10 py-5 text-lg font-bold hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2">
              VIEW THE COURSE <ArrowRight size={20} />
            </Link>
            <Link to="/signup" className="border-2 border-white text-white px-10 py-5 text-lg font-bold hover:bg-white hover:text-black transition-colors">
              START NOW
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
