import { useNavigate, useLocation } from "react-router";
import { Home, BookOpen, MapPin, TrendingUp, User } from "lucide-react";

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: "/student/dashboard", icon: Home, label: "Home" },
    { path: "/student/course", icon: BookOpen, label: "Course" },
    { path: "/student/locations", icon: MapPin, label: "Locations" },
    { path: "/student/analyze", icon: TrendingUp, label: "Analyze" },
    { path: "/student/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black flex z-50">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
              isActive ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <tab.icon size={20} />
            <span className="text-xs font-bold">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
