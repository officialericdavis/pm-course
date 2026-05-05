import { Link } from "react-router";
import { Youtube, Instagram, Facebook } from "lucide-react";

function TikTokIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">

        {/* Brand + nav links */}
        <div className="flex items-center gap-6">
          <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-sm font-black tracking-tight hover:opacity-80 transition-opacity">
            PETER MAYBERRY
          </Link>
          <Link to="/course" className="text-xs font-bold text-neutral-500 hover:opacity-60 transition-opacity">COURSE</Link>
          <Link to="/about" className="text-xs font-bold text-neutral-500 hover:opacity-60 transition-opacity">ABOUT</Link>
          <Link to="/login" className="text-xs font-bold text-neutral-500 hover:opacity-60 transition-opacity">LOGIN</Link>
          <Link to="/privacy" className="text-xs font-bold text-neutral-500 hover:opacity-60 transition-opacity">PRIVACY</Link>
          <Link to="/terms" className="text-xs font-bold text-neutral-500 hover:opacity-60 transition-opacity">TERMS</Link>
        </div>

        {/* Social icons */}
        <div className="flex items-center gap-4">
          <a href="https://www.youtube.com/@petermayberry" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-black transition-colors">
            <Youtube size={18} />
          </a>
          <a href="https://www.instagram.com/mayberrycapital/" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-black transition-colors">
            <Instagram size={18} />
          </a>
          <a href="#" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-black transition-colors">
            <TikTokIcon />
          </a>
          <a href="https://www.facebook.com/mayberrycapital" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-black transition-colors">
            <Facebook size={18} />
          </a>
        </div>

        {/* Copyright */}
        <p className="text-xs text-neutral-400">© 2026 Mayberry Laundromat Academy</p>

      </div>
    </footer>
  );
}