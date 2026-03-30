import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { StudentLayout } from "../../components/layouts/student-layout";
import { CheckCircle, ChevronDown, ChevronRight, Clock, Play } from "lucide-react";
import { toast } from "sonner";
import { projectId } from "/utils/supabase/info";
import { useAuth } from "../../../contexts/auth";
import { VideoPlayer } from "../../components/video-player";
import { useCourseStructure } from "../../../../hooks/use-course-structure";

export function StudentCourse() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const { structure, loading } = useCourseStructure();

  const completedModules: string[] = user?.completedModules ?? [];
  const completedLessons: string[] = user?.completedLessons ?? [];

  const allLessons = structure?.modules.flatMap((m) => m.lessons) ?? [];
  const firstIncomplete = allLessons.find((l) => !completedLessons.includes(l.id));
  const defaultLesson = firstIncomplete?.id ?? allLessons[0]?.id ?? "";

  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [completing, setCompleting] = useState(false);

  // Set defaults once structure loads
  useEffect(() => {
    if (!structure || selectedLesson) return;
    const allLessons = structure.modules.flatMap((m) => m.lessons);
    const firstIncomplete = allLessons.find((l) => !completedLessons.includes(l.id));
    const target = firstIncomplete?.id ?? allLessons[0]?.id ?? "";
    setSelectedLesson(target);
    const parentMod = structure.modules.find((m) => m.lessons.some((l) => l.id === target));
    if (parentMod) setExpandedModules(new Set([parentMod.id]));
  }, [structure]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId);
      return next;
    });
  };

  const handleSelectLesson = (lessonId: string, moduleId: string) => {
    setSelectedLesson(lessonId);
    if (!expandedModules.has(moduleId)) setExpandedModules((prev) => new Set([...prev, moduleId]));
  };

  const handleCompleteLesson = async (lessonId: string) => {
    if (completedLessons.includes(lessonId)) return;
    const token = localStorage.getItem("access_token");
    if (!token) { navigate("/login"); return; }

    setCompleting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/complete-lesson`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lessonId }),
        }
      );
      if (response.status === 401) { navigate("/login"); return; }
      const data = await response.json();
      if (response.ok) {
        setUser({ ...user, completedLessons: data.completedLessons, completedModules: data.completedModules });
        if (data.moduleCompleted) toast.success("Module complete! Great work!");
        else toast.success("Lesson complete! Keep going.");
        // Auto-advance to next lesson
        const currentMod = structure?.modules.find((m) => m.lessons.some((l) => l.id === lessonId));
        const currentIdx = currentMod?.lessons.findIndex((l) => l.id === lessonId) ?? -1;
        if (currentMod && currentIdx < currentMod.lessons.length - 1) {
          setSelectedLesson(currentMod.lessons[currentIdx + 1].id);
        }
      } else {
        toast.error(data.error || "Failed to mark complete.");
      }
    } catch {
      toast.error("Failed to mark complete.");
    } finally {
      setCompleting(false);
    }
  };

  const selectedMod = structure?.modules.find((m) => m.lessons.some((l) => l.id === selectedLesson));
  const selectedLessonData = selectedMod?.lessons.find((l) => l.id === selectedLesson);
  const lessonIndex = selectedMod?.lessons.findIndex((l) => l.id === selectedLesson) ?? 0;
  const isLessonComplete = completedLessons.includes(selectedLesson);
  const videoUrl = selectedLessonData?.videoUrl ?? null;

  const moduleProgress = (mod: typeof structure.modules[0]) => {
    const done = mod.lessons.filter((l) => completedLessons.includes(l.id)).length;
    return { done, total: mod.lessons.length };
  };

  const totalCompleted = completedLessons.length;
  const totalLessons = structure?.modules.reduce((acc, m) => acc + m.lessons.length, 0) ?? 0;

  if (loading) {
    return <StudentLayout><div className="p-6 text-neutral-500">Loading course...</div></StudentLayout>;
  }

  return (
    <StudentLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black">Course Content</h1>
            <p className="text-neutral-500 text-sm mt-1">{totalCompleted} of {totalLessons} lessons complete</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-48 bg-neutral-200 h-2 border border-neutral-300">
              <div className="bg-black h-full transition-all" style={{ width: `${totalLessons > 0 ? (totalCompleted / totalLessons) * 100 : 0}%` }} />
            </div>
            <span className="text-sm font-bold">{totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white border-2 border-black overflow-hidden">
              <div className="bg-black text-white px-4 py-3">
                <p className="font-black text-sm uppercase tracking-wide">Course Modules</p>
              </div>
              <div className="divide-y divide-neutral-200 max-h-[calc(100vh-220px)] overflow-y-auto">
                {structure?.modules.map((mod) => {
                  const { done, total } = moduleProgress(mod);
                  const isModuleComplete = completedModules.includes(mod.id);
                  const isExpanded = expandedModules.has(mod.id);
                  return (
                    <div key={mod.id}>
                      <button onClick={() => toggleModule(mod.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors text-left">
                        <div className="flex items-center gap-3 min-w-0">
                          {isModuleComplete ? (
                            <CheckCircle size={18} className="text-green-500 shrink-0" />
                          ) : (
                            <div className="w-[18px] h-[18px] rounded-full border-2 border-neutral-300 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-neutral-400 uppercase">{mod.id.replace("module-", "Module ")}</p>
                            <p className="text-sm font-bold leading-tight truncate">{mod.title}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs text-neutral-400 font-bold">{done}/{total}</span>
                          {isExpanded ? <ChevronDown size={16} className="text-neutral-400" /> : <ChevronRight size={16} className="text-neutral-400" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="bg-neutral-50 border-t border-neutral-200">
                          {mod.lessons.map((lesson, i) => {
                            const isDone = completedLessons.includes(lesson.id);
                            const isSelected = selectedLesson === lesson.id;
                            return (
                              <button
                                key={lesson.id}
                                onClick={() => handleSelectLesson(lesson.id, mod.id)}
                                className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${isSelected ? "bg-black text-white" : "hover:bg-neutral-100"}`}
                              >
                                {isDone ? (
                                  <CheckCircle size={15} className={isSelected ? "text-green-400 shrink-0" : "text-green-500 shrink-0"} />
                                ) : isSelected ? (
                                  <Play size={15} className="text-white shrink-0" />
                                ) : (
                                  <div className="w-[15px] h-[15px] rounded-full border-2 border-neutral-300 shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className={`text-xs font-bold truncate ${isSelected ? "text-neutral-300" : "text-neutral-600"}`}>{i + 1}. {lesson.title}</p>
                                </div>
                                <span className="text-xs shrink-0 text-neutral-400">{lesson.duration}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Video + Content */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="border-2 border-black overflow-hidden">
              <VideoPlayer
                videoUrl={videoUrl}
                title={selectedLessonData?.title ?? ""}
                lessonNumber={selectedMod ? `${selectedMod.title} · Lesson ${lessonIndex + 1}` : ""}
                onEnded={() => handleCompleteLesson(selectedLesson)}
              />
            </div>

            {selectedLessonData && selectedMod && (
              <div className="bg-white border-2 border-black p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1">
                  {selectedMod.title} · Lesson {lessonIndex + 1} of {selectedMod.lessons.length}
                </p>
                <h2 className="text-2xl font-black mb-1">{selectedLessonData.title}</h2>
                <div className="flex items-center gap-2 text-neutral-500 mb-6">
                  <Clock size={14} />
                  <span className="text-sm">{selectedLessonData.duration}</span>
                </div>
                {isLessonComplete ? (
                  <div className="flex items-center gap-3 bg-green-50 border-2 border-green-500 px-6 py-4">
                    <CheckCircle size={22} className="text-green-600 shrink-0" />
                    <div>
                      <p className="font-black text-green-800">Lesson Complete</p>
                      <p className="text-sm text-green-700">Select the next lesson to continue.</p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleCompleteLesson(selectedLesson)} disabled={completing}
                    className="w-full bg-black text-white px-8 py-4 font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
                  >
                    {completing ? "MARKING COMPLETE..." : "MARK LESSON AS COMPLETE"}
                  </button>
                )}
              </div>
            )}

            {selectedMod && (
              <div className="bg-neutral-50 border-2 border-black p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-sm">{selectedMod.title}</p>
                  <p className="text-sm text-neutral-500">{moduleProgress(selectedMod).done}/{moduleProgress(selectedMod).total} lessons</p>
                </div>
                <div className="w-full bg-neutral-200 h-2 border border-neutral-300">
                  <div className="bg-black h-full transition-all" style={{ width: `${(moduleProgress(selectedMod).done / moduleProgress(selectedMod).total) * 100}%` }} />
                </div>
                <p className="text-xs text-neutral-400 mt-2">{selectedMod.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
