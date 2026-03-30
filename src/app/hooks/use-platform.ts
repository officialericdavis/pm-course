// Determines which platform UI to render.
// Set VITE_PLATFORM=mobile in your .env.local to switch to mobile UI.
// Defaults to "web".
export function usePlatform(): "web" | "mobile" {
  const env = import.meta.env.VITE_PLATFORM;
  return env === "mobile" ? "mobile" : "web";
}
