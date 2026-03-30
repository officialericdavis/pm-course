import { Link } from "react-router";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
        <Link
          to="/"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="text-lg md:text-2xl font-black tracking-tight hover:opacity-80 transition-opacity"
        >
          PETER MAYBERRY
        </Link>

        {/* Centered navigation links - hidden on mobile */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
          <Link to="/course" className="text-xs md:text-sm font-bold tracking-wide uppercase hover:opacity-70 transition-opacity">
            Course
          </Link>
          <Link to="/about" className="text-xs md:text-sm font-bold tracking-wide uppercase hover:opacity-70 transition-opacity">
            About Me
          </Link>
        </div>

        {/* Right-aligned START NOW button */}
        <Link to="/login" className="bg-black text-white px-4 md:px-6 py-2 text-xs md:text-sm font-bold hover:bg-neutral-800 transition-colors">
          START NOW
        </Link>
      </div>
    </nav>
  );
}
