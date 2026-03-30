import { useNavigate } from "react-router";
import { MobileStudentLayout } from "../../components/layouts/mobile-student-layout";
import { BookOpen, TrendingUp, Play } from "lucide-react";
import { useAuth } from "../../../contexts/auth";
import { useCourseStructure } from "../../../../hooks/use-course-structure";

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { structure, totalLessons } = useCourseStructure();

  const completedLessons: string[] = user?.completedLessons ?? [];
  const completedCount = completedLessons.length;
  const percentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const nextModule = structure?.modules.find((m) =>
    m.lessons.some((l) => !completedLessons.includes(l.id))
  );

  return (
    <MobileStudentLayout>
      <div className="p-4">
        <h1 className="text-2xl font-black mb-1">
          Welcome, {user?.name ?? "..."}
        </h1>
        <p className="text-neutral-600 text-sm mb-6">Let's keep building your laundromat empire</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white border-2 border-black p-4 text-center">
            <div className="flex justify-center mb-2">
              <BookOpen size={20} />
            </div>
            <p className="text-2xl font-black">{percentage}%</p>
            <p className="text-xs text-neutral-600">Course Complete</p>
            <div className="mt-2 w-full bg-neutral-200 h-1.5">
              <div className="bg-black h-1.5" style={{ width: `${percentage}%` }} />
            </div>
          </div>
          <div className="bg-white border-2 border-black p-4 text-center">
            <div className="flex justify-center mb-2">
              <TrendingUp size={20} />
            </div>
            <p className="text-2xl font-black">{completedCount}/{totalLessons}</p>
            <p className="text-xs text-neutral-600">Lessons Done</p>
          </div>
        </div>

        {nextModule && (
          <div className="bg-black text-white p-5 mb-6">
            <p className="text-xs text-neutral-400 mb-1">CONTINUE LEARNING</p>
            <h2 className="text-lg font-black mb-3">{nextModule.title}</h2>
            <button
              onClick={() => navigate("/student/course")}
              className="w-full bg-white text-black py-3 font-bold flex items-center justify-center gap-2"
            >
              <Play size={18} />
              RESUME
            </button>
          </div>
        )}
      </div>
    </MobileStudentLayout>
  );
}
