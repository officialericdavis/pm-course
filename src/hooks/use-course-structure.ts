import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  order: number;
  videoUrl: string | null;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  order: number;
  lessons: Lesson[];
}

export interface CourseStructure {
  modules: CourseModule[];
  updatedAt?: string;
}

// Module-level cache — shared across all hook instances
let _cache: CourseStructure | null = null;
let _fetchPromise: Promise<CourseStructure> | null = null;

async function fetchStructure(): Promise<CourseStructure> {
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/course/structure`,
    { headers: { Authorization: `Bearer ${publicAnonKey}` } }
  );
  if (!res.ok) throw new Error("Failed to fetch course structure");
  return res.json();
}

export function invalidateCourseStructureCache() {
  _cache = null;
  _fetchPromise = null;
}

export function useCourseStructure() {
  const [structure, setStructure] = useState<CourseStructure | null>(_cache);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (_cache) { setStructure(_cache); setLoading(false); return; }
    if (!_fetchPromise) _fetchPromise = fetchStructure();
    _fetchPromise
      .then((data) => { _cache = data; setStructure(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const refresh = () => {
    invalidateCourseStructureCache();
    setLoading(true);
    setError(false);
    _fetchPromise = fetchStructure();
    _fetchPromise
      .then((data) => { _cache = data; setStructure(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  };

  const totalLessons = structure?.modules.reduce((acc, m) => acc + m.lessons.length, 0) ?? 0;

  return { structure, loading, error, refresh, totalLessons };
}
