import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/auth";
import { usePlatform } from "./hooks/use-platform";
import { webRouter } from "./web/routes";
import { mobileRouter } from "./mobile/routes";

function PlatformRouter() {
  const platform = usePlatform();
  return <RouterProvider router={platform === "mobile" ? mobileRouter : webRouter} />;
}

function App() {
  return (
    <AuthProvider>
      <PlatformRouter />
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}

export default App;
