import { Link } from "react-router";
import { Navbar } from "../../components/layouts/navbar";
import { Footer } from "../../components/layouts/footer";
import { CheckCircle, X, Shield, Clock, Users, Award, Lock } from "lucide-react";
import { useSettings } from "../../../../hooks/use-settings";

export function CoursePage() {
  const { settings } = useSettings();
  const coursePrice = settings?.coursePrice ?? "$389";

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 text-white relative" style={{backgroundColor: "#000000"}}>
        <div className="absolute inset-0 pointer-events-none" style={{opacity: 0.12, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cdefs%3E%3Cpattern id='smallGrid' width='10' height='10' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 10' fill='none' stroke='%23ffffff' stroke-width='0.5'/%3E%3C/pattern%3E%3Cpattern id='grid' width='80' height='80' patternUnits='userSpaceOnUse'%3E%3Crect width='80' height='80' fill='url(%23smallGrid)'/%3E%3Cpath d='M 80 0 L 0 0 0 80' fill='none' stroke='%23ffffff' stroke-width='1.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`}}></div>
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <h1 className="font-black tracking-tight mb-4 text-4xl md:text-7xl">
            The Laundromat Blueprint
          </h1>
          <p className="text-lg md:text-xl text-neutral-400 mb-8 max-w-2xl mx-auto">
            A complete system for finding, buying, and operating cash-flowing laundromat businesses from scratch.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <div className="flex items-center gap-2 text-neutral-300">
              <Clock className="w-5 h-5" />
              <span>40+ Video Modules</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-300">
              <Award className="w-5 h-5" />
              <span>Lifetime Access</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-12 px-6 bg-neutral-50 border-b-4 border-black">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-5xl font-black mb-2">40+</p>
            <p className="text-sm text-neutral-600">Video Modules</p>
          </div>
          <div>
            <p className="text-5xl font-black mb-2">7</p>
            <p className="text-sm text-neutral-600">Core Sections</p>
          </div>
          <div>
            <p className="text-5xl font-black mb-2">15+</p>
            <p className="text-sm text-neutral-600">Tools & Templates</p>
          </div>
          <div>
            <p className="text-5xl font-black mb-2">∞</p>
            <p className="text-sm text-neutral-600">Lifetime Updates</p>
          </div>
        </div>
      </section>

      {/* Course Modules */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black tracking-tight mb-6">
              What You'll Learn
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              7 comprehensive modules that take you from complete beginner to profitable operator
            </p>
          </div>

          <div className="space-y-6">
            {/* Module 1 */}
            <div className="bg-white border-4 border-black p-8">
              <div className="flex items-start gap-6 mb-6">
                <div className="bg-black text-white px-6 py-3 text-2xl font-black flex-shrink-0">
                  MODULE 1
                </div>
                <div>
                  <h3 className="text-3xl font-black mb-3">Foundation: The Laundromat Business Model</h3>
                  <p className="text-lg text-neutral-600 mb-6">
                    Understand why laundromats work and what makes them profitable
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 pl-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Why laundromats are recession-resistant</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>The true cost of entry</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Revenue models and profit margins</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Time commitment reality check</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Common myths debunked</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>My personal portfolio breakdown</span>
                </div>
              </div>
            </div>

            {/* Module 2 */}
            <div className="bg-white border-4 border-black p-8">
              <div className="flex items-start gap-6 mb-6">
                <div className="bg-black text-white px-6 py-3 text-2xl font-black flex-shrink-0">
                  MODULE 2
                </div>
                <div>
                  <h3 className="text-3xl font-black mb-3">Market Research: Finding Gold Locations</h3>
                  <p className="text-lg text-neutral-600 mb-6">
                    Data-driven strategies for identifying profitable markets and locations
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 pl-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>My 10-point location evaluation system</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Demographics that matter (and don't)</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Competition analysis framework</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Traffic pattern evaluation</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Red flags that kill deals</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Green flags that signal opportunity</span>
                </div>
              </div>
            </div>

            {/* Module 3 */}
            <div className="bg-white border-4 border-black p-8">
              <div className="flex items-start gap-6 mb-6">
                <div className="bg-black text-white px-6 py-3 text-2xl font-black flex-shrink-0">
                  MODULE 3
                </div>
                <div>
                  <h3 className="text-3xl font-black mb-3">Deal Analysis: The Numbers Game</h3>
                  <p className="text-lg text-neutral-600 mb-6">
                    Master financial modeling and know exactly what to pay
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 pl-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>My deal calculator spreadsheet</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Revenue projection modeling</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Operating expense breakdown</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Cash-on-cash return calculations</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Break-even analysis</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>When to walk away from a deal</span>
                </div>
              </div>
            </div>

            {/* Module 4 */}
            <div className="bg-white border-4 border-black p-8">
              <div className="flex items-start gap-6 mb-6">
                <div className="bg-black text-white px-6 py-3 text-2xl font-black flex-shrink-0">
                  MODULE 4
                </div>
                <div>
                  <h3 className="text-3xl font-black mb-3">Securing the Deal: Financing & Negotiation</h3>
                  <p className="text-lg text-neutral-600 mb-6">
                    Get funded and negotiate terms that work in your favor
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 pl-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Financing options and strategies</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>SBA loan navigation</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Seller financing tactics</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Lease negotiation frameworks</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Purchase agreement essentials</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Legal protection strategies</span>
                </div>
              </div>
            </div>

            {/* Module 5 */}
            <div className="bg-white border-4 border-black p-8">
              <div className="flex items-start gap-6 mb-6">
                <div className="bg-black text-white px-6 py-3 text-2xl font-black flex-shrink-0">
                  MODULE 5
                </div>
                <div>
                  <h3 className="text-3xl font-black mb-3">Setup & Equipment: Building Your Store</h3>
                  <p className="text-lg text-neutral-600 mb-6">
                    Equipment selection, layout optimization, and vendor relationships
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 pl-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Washer/dryer selection guide</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Layout design for maximum revenue</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Vendor negotiation tactics</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Payment system setup</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Utilities and infrastructure</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Grand opening strategies</span>
                </div>
              </div>
            </div>

            {/* Module 6 */}
            <div className="bg-white border-4 border-black p-8">
              <div className="flex items-start gap-6 mb-6">
                <div className="bg-black text-white px-6 py-3 text-2xl font-black flex-shrink-0">
                  MODULE 6
                </div>
                <div>
                  <h3 className="text-3xl font-black mb-3">Operations: Running a Tight Ship</h3>
                  <p className="text-lg text-neutral-600 mb-6">
                    Systems and processes that keep things running smoothly
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 pl-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Daily/weekly/monthly checklists</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Maintenance schedules & protocols</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Customer service systems</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Security and loss prevention</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Cash management procedures</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Technology and automation tools</span>
                </div>
              </div>
            </div>

            {/* Module 7 */}
            <div className="bg-white border-4 border-black p-8">
              <div className="flex items-start gap-6 mb-6">
                <div className="bg-black text-white px-6 py-3 text-2xl font-black flex-shrink-0">
                  MODULE 7
                </div>
                <div>
                  <h3 className="text-3xl font-black mb-3">Scale & Optimize: Building Your Portfolio</h3>
                  <p className="text-lg text-neutral-600 mb-6">
                    Expand from one location to multiple cash-flowing assets
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 pl-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>When and how to scale</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Hiring and team building</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Multi-location management</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Revenue optimization strategies</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Exit strategies and selling</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <span>Building generational wealth</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="py-3 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-5xl font-black tracking-tight mb-12 text-center">
            Who This Course Is For
          </h2>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <CheckCircle className="w-8 h-8" />
                Perfect For:
              </h3>
              <ul className="space-y-4">
                <li className="border-l-4 border-black pl-4">
                  <p className="font-bold text-lg mb-1">First-Time Investors</p>
                  <p className="text-neutral-600">
                    Who want to build wealth through real assets, not stocks
                  </p>
                </li>
                <li className="border-l-4 border-black pl-4">
                  <p className="font-bold text-lg mb-1">Corporate Escapees</p>
                  <p className="text-neutral-600">
                    Who want to own a business without quitting their day job (yet)
                  </p>
                </li>
                <li className="border-l-4 border-black pl-4">
                  <p className="font-bold text-lg mb-1">Current Business Owners</p>
                  <p className="text-neutral-600">
                    Who want to diversify with semi-passive cash flow
                  </p>
                </li>
                <li className="border-l-4 border-black pl-4">
                  <p className="font-bold text-lg mb-1">Real Estate Investors</p>
                  <p className="text-neutral-600">
                    Who want higher returns than traditional rentals
                  </p>
                </li>
                <li className="border-l-4 border-black pl-4">
                  <p className="font-bold text-lg mb-1">Action Takers</p>
                  <p className="text-neutral-600">
                    Who are ready to stop watching and start doing
                  </p>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <X className="w-8 h-8" />
                NOT For:
              </h3>
              <ul className="space-y-4">
                <li className="border-l-4 border-neutral-300 pl-4">
                  <p className="font-bold text-lg mb-1 text-neutral-600">Dream Chasers</p>
                  <p className="text-neutral-500">
                    People looking for "laptop lifestyle" businesses
                  </p>
                </li>
                <li className="border-l-4 border-neutral-300 pl-4">
                  <p className="font-bold text-lg mb-1 text-neutral-600">Zero Capital</p>
                  <p className="text-neutral-500">
                    Those with no savings and no financing plan
                  </p>
                </li>
                <li className="border-l-4 border-neutral-300 pl-4">
                  <p className="font-bold text-lg mb-1 text-neutral-600">Instant Gratification</p>
                  <p className="text-neutral-500">
                    People who need profits this week
                  </p>
                </li>
                <li className="border-l-4 border-neutral-300 pl-4">
                  <p className="font-bold text-lg mb-1 text-neutral-600">Theory Collectors</p>
                  <p className="text-neutral-500">
                    Those who buy courses but never implement
                  </p>
                </li>
                <li className="border-l-4 border-neutral-300 pl-4">
                  <p className="font-bold text-lg mb-1 text-neutral-600">Excuse Makers</p>
                  <p className="text-neutral-500">
                    People who blame external factors for their situation
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-neutral-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-black tracking-tight mb-12 text-center">
            Questions?
          </h2>

          <div className="space-y-6">
            <div className="bg-white border-l-4 border-black p-6">
              <h3 className="text-xl font-bold mb-2">Do I need experience to start?</h3>
              <p className="text-neutral-700">
                No. This course is designed for complete beginners. I walk you through every single step.
              </p>
            </div>

            <div className="bg-white border-l-4 border-black p-6">
              <h3 className="text-xl font-bold mb-2">How much money do I need to get started?</h3>
              <p className="text-neutral-700">
                Typically $25K-$50K to buy your first location. I cover financing options including
                SBA loans and seller financing if you don't have it all upfront.
              </p>
            </div>

            <div className="bg-white border-l-4 border-black p-6">
              <h3 className="text-xl font-bold mb-2">How much time does this require?</h3>
              <p className="text-neutral-700">
                Setup phase requires 10-15 hours per week for 2-3 months. Once running, 2-5 hours
                per week depending on how automated you make it.
              </p>
            </div>

            <div className="bg-white border-l-4 border-black p-6">
              <h3 className="text-xl font-bold mb-2">Can I do this while working full-time?</h3>
              <p className="text-neutral-700">
                Yes. Most of my students keep their day jobs during setup. Laundromats are designed
                to be semi-passive once operational.
              </p>
            </div>

            <div className="bg-white border-l-4 border-black p-6">
              <h3 className="text-xl font-bold mb-2">What's your refund policy?</h3>
              <p className="text-neutral-700">
                30-day money-back guarantee. Go through the entire course. If you don't think it's worth
                10x what you paid, email us for a full refund.
              </p>
            </div>

            <div className="bg-white border-l-4 border-black p-6">
              <h3 className="text-xl font-bold mb-2">Is this available in my country?</h3>
              <p className="text-neutral-700">
                The course is primarily focused on the U.S. market, but the principles apply globally.
                You'll need to adapt local regulations and financing options.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-black text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-black tracking-tight mb-6">
            Stop waiting for the perfect time.
          </h2>
          <p className="text-2xl text-neutral-300 mb-12">
            Every day you wait is another day someone else is building wealth
            while you're stuck watching from the sidelines.
          </p>
          <Link
            to="/signup"
            className="inline-block bg-white text-black px-12 py-6 text-xl font-bold hover:bg-neutral-200 transition-colors"
          >
            {/* START YOUR LAUNDROMAT JOURNEY — {coursePrice} */}
            START YOUR LAUNDROMAT JOURNEY — $389
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
