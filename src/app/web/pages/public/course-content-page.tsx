import { useState } from "react";
import { useNavigate } from "react-router";
import { projectId } from "/utils/supabase/info";
import { Navbar } from "../../components/layouts/navbar";
import { Footer } from "../../components/layouts/footer";
import { CheckCircle, Lock, Play, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../contexts/auth";

const COURSE_MODULES = [
  {
    id: "module-1",
    title: "Foundation: The Laundromat Business Model",
    lessons: 6,
    description: "Understand why laundromats work and what makes them profitable",
  },
  {
    id: "module-2",
    title: "Market Research: Finding Gold Locations",
    lessons: 6,
    description: "Data-driven strategies for identifying profitable markets",
  },
  {
    id: "module-3",
    title: "Deal Analysis: The Numbers Game",
    lessons: 6,
    description: "Master financial modeling and know exactly what to pay",
  },
  {
    id: "module-4",
    title: "Securing the Deal: Financing & Negotiation",
    lessons: 6,
    description: "Get funded and negotiate terms that work in your favor",
  },
  {
    id: "module-5",
    title: "Setup & Equipment: Building Your Store",
    lessons: 6,
    description: "Equipment selection, layout optimization, and vendor relationships",
  },
  {
    id: "module-6",
    title: "Operations: Running a Tight Ship",
    lessons: 6,
    description: "Systems and processes that keep things running smoothly",
  },
  {
    id: "module-7",
    title: "Scale & Optimize: Building Your Portfolio",
    lessons: 6,
    description: "Expand from one location to multiple cash-flowing assets",
  },
];

export function CourseContentPage() {
  const { user, logout } = useAuth();
  const [completedModules, setCompletedModules] = useState<string[]>(
    () => user?.completedModules ?? []
  );
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleCompleteModule = async (moduleId: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/complete-module`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ moduleId }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setCompletedModules(data.completedModules);
        toast.success("Module marked as complete!");
      } else {
        toast.error(data.error || "Failed to mark module as complete.");
      }
    } catch (err) {
      console.error("Complete module error:", err);
      toast.error("Failed to mark module as complete.");
    }
  };

  const completionPercentage = Math.round(
    (completedModules.length / COURSE_MODULES.length) * 100
  );

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-12">
            <div>
              <h1 className="text-5xl font-black tracking-tight mb-4">
                Course Dashboard
              </h1>
              <p className="text-xl text-neutral-600">
                Welcome back, {user?.name}!
              </p>
            </div>
            <div className="flex gap-4">
              {user?.isAdmin && (
                <button
                  onClick={() => navigate("/admin")}
                  className="bg-neutral-800 text-white px-6 py-3 font-bold hover:bg-neutral-700 transition-colors"
                >
                  ADMIN DASHBOARD
                </button>
              )}
              <button
                onClick={handleLogout}
                className="border-2 border-black px-6 py-3 font-bold hover:bg-black hover:text-white transition-colors flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                LOGOUT
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-neutral-50 border-2 border-black p-6 mb-12">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xl font-bold">Your Progress</h3>
              <span className="text-2xl font-black">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-neutral-200 h-4 border-2 border-black">
              <div
                className="bg-black h-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="text-sm text-neutral-600 mt-2">
              {completedModules.length} of {COURSE_MODULES.length} modules completed
            </p>
          </div>

          {/* Course Modules */}
          <div className="space-y-6">
            {COURSE_MODULES.map((module, index) => {
              const isCompleted = completedModules.includes(module.id);
              const isSelected = selectedModule === module.id;

              return (
                <div
                  key={module.id}
                  className={`border-4 border-black ${
                    isCompleted ? "bg-neutral-50" : "bg-white"
                  }`}
                >
                  <button
                    onClick={() => setSelectedModule(isSelected ? null : module.id)}
                    className="w-full p-6 flex items-center justify-between hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex items-center gap-6 text-left">
                      <div className="bg-black text-white px-5 py-3 text-xl font-black">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold mb-2">{module.title}</h3>
                        <p className="text-neutral-600">{module.description}</p>
                        <p className="text-sm text-neutral-500 mt-1">
                          {module.lessons} lessons
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {isCompleted ? (
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      ) : (
                        <Lock className="w-8 h-8 text-neutral-400" />
                      )}
                    </div>
                  </button>

                  {isSelected && (
                    <div className="border-t-4 border-black p-6 bg-white">
                      <div className="mb-6">
                        <h4 className="text-xl font-bold mb-4">Module Content</h4>
                        <div className="space-y-3">
                          {Array.from({ length: module.lessons }).map((_, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 p-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
                            >
                              <Play className="w-5 h-5" />
                              <span className="font-medium">
                                Lesson {i + 1}: {module.title} Part {i + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {!isCompleted && (
                        <button
                          onClick={() => handleCompleteModule(module.id)}
                          className="bg-black text-white px-8 py-3 font-bold hover:bg-neutral-800 transition-colors"
                        >
                          MARK AS COMPLETE
                        </button>
                      )}

                      {isCompleted && (
                        <div className="bg-green-50 border-l-4 border-green-500 p-4">
                          <p className="font-bold text-green-800">
                            ✓ Module Completed
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
