import { Link, useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Map,
  BarChart3,
  CreditCard,
  BookOpen,
  Settings,
  LogOut,
  Mail,
  Globe,
  Database,
  FileText,
} from "lucide-react";

const NAV_ITEMS = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/website-analytics", label: "Website Analytics", icon: Globe },
  { path: "/admin/students", label: "Students", icon: Users },
  { path: "/admin/locations", label: "Locations", icon: MapPin },
  { path: "/admin/map", label: "Map View", icon: Map },
  { path: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/admin/payments", label: "Payments", icon: CreditCard },
  { path: "/admin/courses", label: "Courses", icon: BookOpen },
  { path: "/admin/email-marketing", label: "Email Marketing", icon: Mail },
  { path: "/admin/database", label: "Laundromat DB", icon: Database },
  { path: "/admin/legal", label: "Legal Pages", icon: FileText },
  { path: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Sidebar */}
      <div className="w-64 bg-black text-white flex flex-col">
        <div className="p-6 border-b border-neutral-800">
          <h1 className="text-2xl font-black">ADMIN PORTAL</h1>
        </div>

        <nav className="flex-1 p-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded mb-1 transition-colors font-bold uppercase ${
                  isActive
                    ? "bg-white text-black"
                    : "text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                <Icon size={20} />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded text-neutral-300 hover:bg-neutral-800 transition-colors w-full font-bold uppercase"
          >
            <LogOut size={20} />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}