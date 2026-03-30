import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, Users, MapPin, BarChart2, CreditCard, BookOpen, Activity, Settings } from "lucide-react";
import { useAuth } from "../../../contexts/auth";

export function MobileAdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const tabs = [
    { path: "/admin/dashboard", icon: LayoutDashboard, label: "Home" },
    { path: "/admin/students", icon: Users, label: "Students" },
    { path: "/admin/courses", icon: BookOpen, label: "Courses" },
    { path: "/admin/analytics", icon: BarChart2, label: "Analytics" },
    { path: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <main>{children}</main>
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
    </div>
  );
}
