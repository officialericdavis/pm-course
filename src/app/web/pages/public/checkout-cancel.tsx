import { Link } from "react-router";
import { Navbar } from "../../components/layouts/navbar";
import { Footer } from "../../components/layouts/footer";

export function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-32 pb-20 px-6 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <h1 className="text-4xl font-black tracking-tight mb-3">Checkout Cancelled</h1>
          <p className="text-lg text-neutral-500 mb-10">
            No worries — nothing was charged. Ready when you are.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="bg-black text-white px-8 py-4 font-bold hover:bg-neutral-800 transition-colors">
              TRY AGAIN
            </Link>
            <Link to="/course" className="border-2 border-black px-8 py-4 font-bold hover:bg-black hover:text-white transition-colors">
              VIEW COURSE
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
