import { useNavigate } from "react-router";
import { StudentLayout } from "../../components/layouts/student-layout";
import { BookOpen, MapPin, TrendingUp, Play } from "lucide-react";
import { useAuth } from "../../../contexts/auth";
import { useCourseStructure } from "../../../../hooks/use-course-structure";

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { structure, totalLessons } = useCourseStructure();

  const completedModules: string[] = user?.completedModules ?? [];
  const completedLessons: string[] = user?.completedLessons ?? [];
  const completedCount = completedLessons.length;
  const percentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Find the next incomplete lesson's module
  const nextModule = structure?.modules.find((m) =>
    m.lessons.some((l) => !completedLessons.includes(l.id))
  );

  return (
    <StudentLayout>
      <div className="p-8">
        <h1 className="text-4xl font-black mb-2">
          Welcome Back, {user?.name ?? "..."}
        </h1>
        <p className="text-neutral-600 mb-8">Let's keep building your laundromat empire</p>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border-2 border-black p-6 text-center">
            <div className="flex justify-center mb-2">
              <BookOpen size={24} />
            </div>
            <p className="text-3xl font-black mb-1">{percentage}%</p>
            <p className="text-sm text-neutral-600">Course Completion</p>
            <div className="mt-3 w-full bg-neutral-200 h-2">
              <div className="bg-black h-2" style={{ width: `${percentage}%` }}></div>
            </div>
          </div>

          <div className="bg-white border-2 border-black p-6 text-center">
            <div className="flex justify-center mb-2">
              <TrendingUp size={24} />
            </div>
            <p className="text-3xl font-black mb-1">
              {completedCount}/{totalLessons}
            </p>
            <p className="text-sm text-neutral-600">Lessons Completed</p>
          </div>

          <div className="bg-white border-2 border-black p-6 text-center">
            <div className="flex justify-center mb-2">
              <MapPin size={24} />
            </div>
            <p className="text-3xl font-black mb-1">—</p>
            <p className="text-sm text-neutral-600">Locations Submitted</p>
          </div>
        </div>

        {/* Continue Learning */}
        {nextModule && (
          <div className="bg-black text-white p-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400 mb-1">CONTINUE LEARNING</p>
                <h2 className="text-2xl font-black mb-2">{nextModule.title}</h2>
                <p className="text-neutral-300">Pick up where you left off</p>
              </div>
              <button
                onClick={() => navigate("/student/course")}
                className="bg-white text-black px-8 py-3 font-bold hover:bg-neutral-200 transition-colors flex items-center gap-2"
              >
                <Play size={20} />
                RESUME
              </button>
            </div>
          </div>
        )}

        {totalLessons > 0 && completedLessons.length === totalLessons && (
          <div className="bg-green-50 border-2 border-green-500 p-8 mb-8">
            <h2 className="text-2xl font-black text-green-800 mb-2">Course Complete!</h2>
            <p className="text-green-700">You've completed all {totalLessons} lessons. Congratulations!</p>
          </div>
        )}

        {/* Completed Modules */}
        {completedModules.length > 0 && (
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-black mb-4">Completed Modules</h2>
            <div className="space-y-3">
              {completedModules.map((id) => {
                const mod = structure?.modules.find((m) => m.id === id);
                return (
                  <div key={id} className="flex items-center gap-3 border-b border-neutral-200 pb-3 last:border-0">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <p className="font-medium">{mod?.title ?? id}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
