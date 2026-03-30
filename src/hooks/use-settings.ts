import { useState, useEffect } from "react";
import { projectId } from "/utils/supabase/info";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c`;

let _cachedSettings: { coursePrice: string; platformName: string } | null = null;
let _fetchPromise: Promise<void> | null = null;

export function useSettings() {
  const [settings, setSettings] = useState<{ coursePrice: string; platformName: string } | null>(
    _cachedSettings
  );
  const [loading, setLoading] = useState(!_cachedSettings);

  useEffect(() => {
    if (_cachedSettings) {
      setSettings(_cachedSettings);
      setLoading(false);
      return;
    }

    if (!_fetchPromise) {
      _fetchPromise = fetch(`${API}/settings`)
        .then((r) => r.json())
        .then((data) => {
          if (data.settings) _cachedSettings = data.settings;
        })
        .catch(() => { _fetchPromise = null; }); // reset on error so next render retries
    }

    _fetchPromise.then(() => {
      setSettings(_cachedSettings);
      setLoading(false);
    });
  }, []);

  return { settings, loading };
}
