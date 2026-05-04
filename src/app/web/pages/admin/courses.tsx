import { useState, useRef } from "react";
import { AdminLayout } from "../../components/layouts/admin-layout";
import {
  ChevronDown, ChevronRight, Edit2, Trash2, Plus, Save, X,
  Upload, ArrowUp, ArrowDown, GripVertical, Link as LinkIcon, Loader2,
} from "lucide-react";
import { projectId } from "/utils/supabase/info";
import { toast } from "sonner";
import { useCourseStructure, invalidateCourseStructureCache, type CourseModule, type Lesson } from "../../../../hooks/use-course-structure";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c`;

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token")}` };
}

// Inline editable text field
function InlineEdit({ value, onSave, className = "", placeholder = "" }: {
  value: string; onSave: (v: string) => void; className?: string; placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== value) onSave(draft.trim());
    else setDraft(value);
  };
  if (!editing) return (
    <span
      className={`cursor-pointer hover:opacity-60 transition-opacity ${className}`}
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
    >{value || <span className="text-neutral-400 italic">{placeholder}</span>}</span>
  );
  return (
    <input
      autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
      onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
      className={`border-b-2 border-black focus:outline-none bg-transparent ${className}`}
    />
  );
}

export function AdminCourses() {
  const { structure, loading, refresh } = useCourseStructure();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["module-1"]));
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingLesson, setAddingLesson] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const newLessonRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLesson, setUploadingLesson] = useState<string | null>(null);
  const [uploadingModuleId, setUploadingModuleId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const totalLessons = structure?.modules.reduce((acc, m) => acc + m.lessons.length, 0) ?? 0;
  const videosUploaded = structure?.modules.reduce(
    (acc, m) => acc + m.lessons.filter((l) => l.videoUrl).length, 0
  ) ?? 0;

  // ── API helpers ──────────────────────────────────────────────────────────

  async function apiCall(url: string, options: RequestInit): Promise<{ ok: boolean; data: any }> {
    try {
      const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...(options.headers as Record<string, string> ?? {}) } });
      let data: any = {};
      try { data = await res.json(); } catch {}
      return { ok: res.ok, data };
    } catch (err) {
      console.error("[apiCall] Network error:", err);
      return { ok: false, data: { error: "Network error. Please try again." } };
    }
  }

  const patchModule = async (moduleId: string, updates: Record<string, unknown>) => {
    const { ok, data } = await apiCall(`${API}/admin/modules/${moduleId}`, {
      method: "PATCH", body: JSON.stringify(updates),
    });
    if (!ok) { toast.error(data.error || "Failed to update"); return; }
    invalidateCourseStructureCache();
    refresh();
  };

  const deleteModule = async (moduleId: string, title: string) => {
    if (!confirm(`Delete module "${title}" and all its lessons? This cannot be undone.`)) return;
    const { ok, data } = await apiCall(`${API}/admin/modules/${moduleId}`, { method: "DELETE" });
    if (!ok) { toast.error(data.error || "Failed to delete"); return; }
    toast.success("Module deleted");
    invalidateCourseStructureCache();
    refresh();
  };

  const addModule = async () => {
    if (!newModuleTitle.trim()) return;
    setSaving(true);
    const { ok, data } = await apiCall(`${API}/admin/modules`, {
      method: "POST", body: JSON.stringify({ title: newModuleTitle.trim() }),
    });
    setSaving(false);
    if (!ok) { toast.error(data.error || "Failed to add module"); return; }
    toast.success("Module added");
    setNewModuleTitle("");
    setAddingModule(false);
    invalidateCourseStructureCache();
    refresh();
  };

  const patchLesson = async (moduleId: string, lessonId: string, updates: Record<string, unknown>) => {
    const { ok, data } = await apiCall(`${API}/admin/modules/${moduleId}/lessons/${lessonId}`, {
      method: "PATCH", body: JSON.stringify(updates),
    });
    if (!ok) { toast.error(data.error || "Failed to update"); return; }
    invalidateCourseStructureCache();
    refresh();
  };

  const deleteLesson = async (moduleId: string, lessonId: string, title: string) => {
    if (!confirm(`Delete lesson "${title}"?`)) return;
    const { ok, data } = await apiCall(`${API}/admin/modules/${moduleId}/lessons/${lessonId}`, { method: "DELETE" });
    if (!ok) { toast.error(data.error || "Failed to delete"); return; }
    toast.success("Lesson deleted");
    invalidateCourseStructureCache();
    refresh();
  };

  const addLesson = async (moduleId: string) => {
    if (!newLessonTitle.trim()) return;
    setSaving(true);
    const { ok, data } = await apiCall(`${API}/admin/modules/${moduleId}/lessons`, {
      method: "POST", body: JSON.stringify({ title: newLessonTitle.trim() }),
    });
    setSaving(false);
    if (!ok) { toast.error(data.error || "Failed to add lesson"); return; }
    toast.success("Lesson added");
    setNewLessonTitle("");
    setAddingLesson(null);
    invalidateCourseStructureCache();
    refresh();
  };

  const saveVideoUrl = async (moduleId: string, lessonId: string) => {
    setSaving(true);
    await patchLesson(moduleId, lessonId, { videoUrl: videoUrl.trim() || null });
    setSaving(false);
    toast.success("Video URL saved");
    setEditingVideo(null);
    setVideoUrl("");
  };

  const handleVideoUpload = async (moduleId: string, lessonId: string, file: File) => {
    setUploadingLesson(lessonId);
    setUploadingModuleId(moduleId);
    setUploadProgress(0);
    try {
      // 1. Get presigned URL from edge function
      const res = await fetch(`${API}/admin/upload-video-url`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ lessonId, filename: file.name, contentType: file.type || "video/mp4" }),
      });
      const { presignedUrl, videoPublicUrl, objectKey, error } = await res.json();
      if (!res.ok || !presignedUrl) { toast.error(error || "Failed to get upload URL"); return; }

      // 2. Upload directly to R2 via XHR (for progress tracking)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      // 3. Save the public URL + objectKey so we can delete later
      await patchLesson(moduleId, lessonId, { videoUrl: videoPublicUrl, videoObjectKey: objectKey });
      toast.success("Video uploaded and saved!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingLesson(null);
      setUploadingModuleId(null);
      setUploadProgress(0);
    }
  };

  const handleDeleteVideo = async (moduleId: string, lessonId: string, objectKey: string | null) => {
    if (!confirm("Delete this video? This cannot be undone.")) return;
    try {
      if (objectKey) {
        // Delete from R2
        const res = await fetch(`${API}/admin/delete-video/${lessonId}`, {
          method: "DELETE",
          headers: authHeaders(),
          body: JSON.stringify({ objectKey, moduleId }),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error || "Failed to delete video"); return; }
      } else {
        // Just clear the URL (manually set URL, no R2 object)
        await patchLesson(moduleId, lessonId, { videoUrl: null, videoObjectKey: null });
      }
      toast.success("Video deleted");
      invalidateCourseStructureCache();
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  const moveModule = (moduleId: string, direction: "up" | "down") => {
    if (!structure) return;
    const idx = structure.modules.findIndex((m) => m.id === moduleId);
    const newOrder = direction === "up" ? idx - 1 : idx + 1;
    if (newOrder < 0 || newOrder >= structure.modules.length) return;
    patchModule(moduleId, { order: newOrder });
  };

  const moveLesson = (mod: CourseModule, lessonId: string, direction: "up" | "down") => {
    const idx = mod.lessons.findIndex((l) => l.id === lessonId);
    const newOrder = direction === "up" ? idx - 1 : idx + 1;
    if (newOrder < 0 || newOrder >= mod.lessons.length) return;
    patchLesson(mod.id, lessonId, { order: newOrder });
  };

  if (loading) {
    return <AdminLayout><div className="p-8 text-neutral-500">Loading course data...</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-black">Course Builder</h1>
          <div className="flex items-center gap-6 text-sm text-neutral-500">
            <span><strong className="text-black">{structure?.modules.length ?? 0}</strong> modules</span>
            <span><strong className="text-black">{totalLessons}</strong> lessons</span>
            <span><strong className="text-black">{videosUploaded}/{totalLessons}</strong> videos</span>
          </div>
        </div>

        {/* Upload progress */}
        <div className="bg-white border-2 border-black p-5 mb-8">
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-sm">Video Upload Progress</p>
            <p className="text-sm font-bold">{videosUploaded} / {totalLessons}</p>
          </div>
          <div className="w-full bg-neutral-200 h-3">
            <div className="bg-black h-full transition-all" style={{ width: `${totalLessons > 0 ? (videosUploaded / totalLessons) * 100 : 0}%` }} />
          </div>
          <p className="text-xs text-neutral-400 mt-2">Click any lesson title, description, or duration to edit inline. Click the link icon to set a video URL.</p>
        </div>

        {/* Modules */}
        <div className="space-y-3">
          {structure?.modules.map((mod, modIdx) => {
            const isExpanded = expanded.has(mod.id);
            const lessonsWithVideo = mod.lessons.filter((l) => l.videoUrl).length;

            return (
              <div key={mod.id} className="bg-white border-2 border-black overflow-hidden">
                {/* Module Header */}
                <div className="flex items-center gap-3 p-4 hover:bg-neutral-50 transition-colors">
                  <GripVertical size={16} className="text-neutral-300 shrink-0" />

                  {/* Expand toggle */}
                  <button onClick={() => setExpanded((prev) => { const n = new Set(prev); n.has(mod.id) ? n.delete(mod.id) : n.add(mod.id); return n; })} className="shrink-0">
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {/* Module number */}
                  <div className="bg-black text-white px-2.5 py-1.5 text-xs font-black shrink-0">
                    {String(modIdx + 1).padStart(2, "0")}
                  </div>

                  {/* Title + description */}
                  <div className="flex-1 min-w-0">
                    <InlineEdit
                      value={mod.title}
                      onSave={(v) => patchModule(mod.id, { title: v })}
                      className="font-bold text-base"
                      placeholder="Module title"
                    />
                    <div className="text-xs text-neutral-400 mt-0.5 flex items-center gap-3">
                      <InlineEdit value={mod.description} onSave={(v) => patchModule(mod.id, { description: v })} placeholder="Add description" />
                      <span>·</span>
                      <InlineEdit value={mod.duration} onSave={(v) => patchModule(mod.id, { duration: v })} placeholder="Duration" />
                      <span>·</span>
                      <span>{lessonsWithVideo}/{mod.lessons.length} videos</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => moveModule(mod.id, "up")} disabled={modIdx === 0} className="p-1.5 hover:bg-neutral-100 disabled:opacity-20 transition-colors" title="Move up">
                      <ArrowUp size={14} />
                    </button>
                    <button onClick={() => moveModule(mod.id, "down")} disabled={modIdx === (structure?.modules.length ?? 1) - 1} className="p-1.5 hover:bg-neutral-100 disabled:opacity-20 transition-colors" title="Move down">
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => { setAddingLesson(mod.id); setExpanded((p) => new Set([...p, mod.id])); setTimeout(() => newLessonRef.current?.focus(), 50); }}
                      className="p-1.5 hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-black" title="Add lesson"
                    >
                      <Plus size={14} />
                    </button>
                    <button onClick={() => deleteModule(mod.id, mod.title)} className="p-1.5 hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors" title="Delete module">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Lessons */}
                {isExpanded && (
                  <div className="border-t-2 border-black divide-y divide-neutral-100">
                    {mod.lessons.map((lesson, lessonIdx) => {
                      const isEditingThisVideo = editingVideo === lesson.id;
                      return (
                        <div key={lesson.id} className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <GripVertical size={14} className="text-neutral-200 shrink-0" />
                            <span className="text-xs font-bold text-neutral-400 w-6 shrink-0">{lessonIdx + 1}</span>

                            <div className="flex-1 min-w-0">
                              <InlineEdit
                                value={lesson.title}
                                onSave={(v) => patchLesson(mod.id, lesson.id, { title: v })}
                                className="font-semibold text-sm"
                                placeholder="Lesson title"
                              />
                              <div className="text-xs text-neutral-400 mt-0.5">
                                <InlineEdit value={lesson.duration} onSave={(v) => patchLesson(mod.id, lesson.id, { duration: v })} placeholder="0:00" />
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {uploadingLesson === lesson.id ? (
                                <div className="flex items-center gap-2 px-2">
                                  <Loader2 size={13} className="animate-spin text-neutral-500" />
                                  <span className="text-xs font-bold text-neutral-500">{uploadProgress}%</span>
                                </div>
                              ) : (
                                <>
                                  {lesson.videoUrl ? (
                                    <div className="flex items-center gap-1">
                                      <span className="px-2 py-0.5 text-xs font-bold bg-green-100 text-green-700">LIVE</span>
                                      <button
                                        onClick={() => handleDeleteVideo(mod.id, lesson.id, (lesson as any).videoObjectKey ?? null)}
                                        className="p-1.5 hover:bg-red-50 text-neutral-300 hover:text-red-500 transition-colors"
                                        title="Delete video"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="px-2 py-0.5 text-xs font-bold bg-neutral-100 text-neutral-400">NO VIDEO</span>
                                  )}
                                  {/* Upload button */}
                                  <button
                                    onClick={() => {
                                      const input = document.createElement("input");
                                      input.type = "file";
                                      input.accept = "video/*";
                                      input.onchange = (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file) handleVideoUpload(mod.id, lesson.id, file);
                                      };
                                      input.click();
                                    }}
                                    className="p-1.5 hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-black"
                                    title="Upload video to R2"
                                  >
                                    <Upload size={13} />
                                  </button>
                                  {/* Manual URL button */}
                                  <button
                                    onClick={() => { setEditingVideo(lesson.id); setVideoUrl(lesson.videoUrl ?? ""); }}
                                    className="p-1.5 hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-black"
                                    title="Set video URL manually"
                                  >
                                    <LinkIcon size={13} />
                                  </button>
                                </>
                              )}
                              <button onClick={() => moveLesson(mod, lesson.id, "up")} disabled={lessonIdx === 0} className="p-1.5 hover:bg-neutral-100 disabled:opacity-20 transition-colors">
                                <ArrowUp size={13} />
                              </button>
                              <button onClick={() => moveLesson(mod, lesson.id, "down")} disabled={lessonIdx === mod.lessons.length - 1} className="p-1.5 hover:bg-neutral-100 disabled:opacity-20 transition-colors">
                                <ArrowDown size={13} />
                              </button>
                              <button onClick={() => deleteLesson(mod.id, lesson.id, lesson.title)} className="p-1.5 hover:bg-red-50 text-neutral-300 hover:text-red-600 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Upload progress bar */}
                          {uploadingLesson === lesson.id && (
                            <div className="mt-2 ml-7">
                              <div className="w-full bg-neutral-100 h-1.5">
                                <div className="bg-black h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                              </div>
                              <p className="text-xs text-neutral-400 mt-1">Uploading to Cloudflare R2... {uploadProgress}%</p>
                            </div>
                          )}

                          {/* Video URL editor */}
                          {isEditingThisVideo && (
                            <div className="mt-3 ml-7 flex gap-2">
                              <input
                                autoFocus type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                                placeholder="https://... (video URL)"
                                className="flex-1 px-3 py-2 text-sm border-2 border-black focus:outline-none"
                                onKeyDown={(e) => { if (e.key === "Enter") saveVideoUrl(mod.id, lesson.id); if (e.key === "Escape") { setEditingVideo(null); setVideoUrl(""); } }}
                              />
                              {videoUrl && (
                                <button onClick={() => { setVideoUrl(""); }} className="px-3 py-2 border-2 border-neutral-300 text-xs text-neutral-500 hover:border-red-400 hover:text-red-500 transition-colors">
                                  Clear
                                </button>
                              )}
                              <button onClick={() => saveVideoUrl(mod.id, lesson.id)} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-bold hover:bg-neutral-800 disabled:opacity-50 transition-colors">
                                <Save size={13} /> SAVE
                              </button>
                              <button onClick={() => { setEditingVideo(null); setVideoUrl(""); }} className="p-2 border-2 border-neutral-200 hover:border-black transition-colors">
                                <X size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add Lesson row */}
                    {addingLesson === mod.id ? (
                      <div className="px-5 py-3 flex gap-2 bg-neutral-50">
                        <input
                          ref={newLessonRef} type="text" value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)}
                          placeholder="Lesson title"
                          className="flex-1 px-3 py-2 text-sm border-2 border-black focus:outline-none"
                          onKeyDown={(e) => { if (e.key === "Enter") addLesson(mod.id); if (e.key === "Escape") { setAddingLesson(null); setNewLessonTitle(""); } }}
                        />
                        <button onClick={() => addLesson(mod.id)} disabled={saving || !newLessonTitle.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-bold hover:bg-neutral-800 disabled:opacity-50 transition-colors">
                          <Save size={13} /> ADD
                        </button>
                        <button onClick={() => { setAddingLesson(null); setNewLessonTitle(""); }} className="p-2 border-2 border-neutral-200 hover:border-black transition-colors">
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingLesson(mod.id); setTimeout(() => newLessonRef.current?.focus(), 50); }}
                        className="w-full flex items-center gap-2 px-5 py-3 text-sm text-neutral-400 hover:text-black hover:bg-neutral-50 transition-colors"
                      >
                        <Plus size={14} /> Add lesson
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Module */}
        <div className="mt-4">
          {addingModule ? (
            <div className="flex gap-2 p-4 border-2 border-black border-dashed">
              <input
                autoFocus type="text" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)}
                placeholder="New module title"
                className="flex-1 px-3 py-2 border-2 border-black focus:outline-none"
                onKeyDown={(e) => { if (e.key === "Enter") addModule(); if (e.key === "Escape") { setAddingModule(false); setNewModuleTitle(""); } }}
              />
              <button onClick={addModule} disabled={saving || !newModuleTitle.trim()} className="flex items-center gap-2 px-6 py-2 bg-black text-white font-bold hover:bg-neutral-800 disabled:opacity-50 transition-colors">
                <Save size={14} /> ADD MODULE
              </button>
              <button onClick={() => { setAddingModule(false); setNewModuleTitle(""); }} className="p-2 border-2 border-neutral-300 hover:border-black transition-colors">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingModule(true)}
              className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-neutral-300 text-neutral-400 hover:border-black hover:text-black transition-colors font-bold"
            >
              <Plus size={16} /> ADD MODULE
            </button>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}