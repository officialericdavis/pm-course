import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { useAuth } from "../contexts/auth";

// Public pages — loaded eagerly (these are what visitors see first)
import { LandingPage } from "./pages/public/landing-page";
import { AboutPage } from "./pages/public/about-page";
import { LegalPage } from "./pages/public/legal-page";
import { CoursePage } from "./pages/public/course-page";
import { SkillGamesPage } from "./pages/public/skill-games-page";
import { LoginPage } from "./pages/public/login-page";
import { SignupPage } from "./pages/public/signup-page";
import { ForgotPasswordPage } from "./pages/public/forgot-password";
import { ResetPasswordPage } from "./pages/public/reset-password";
import { CheckoutSuccessPage } from "./pages/public/checkout-success";
import { CheckoutCancelPage } from "./pages/public/checkout-cancel";

// Protected pages — lazy loaded (only downloaded when user is logged in)
const CourseContentPage = lazy(() => import("./pages/public/course-content-page").then(m => ({ default: m.CourseContentPage })));
const AdminDashboardPage = lazy(() => import("./pages/admin/dashboard-page").then(m => ({ default: m.AdminDashboardPage })));
const AdminDashboard     = lazy(() => import("./pages/admin/dashboard").then(m => ({ default: m.AdminDashboard })));
const AdminStudents      = lazy(() => import("./pages/admin/students").then(m => ({ default: m.AdminStudents })));
const AdminLocations     = lazy(() => import("./pages/admin/locations").then(m => ({ default: m.AdminLocations })));
const AdminMap           = lazy(() => import("./pages/admin/map").then(m => ({ default: m.AdminMap })));
const AdminAnalytics     = lazy(() => import("./pages/admin/analytics").then(m => ({ default: m.AdminAnalytics })));
const AdminPayments      = lazy(() => import("./pages/admin/payments").then(m => ({ default: m.AdminPayments })));
const AdminCourses       = lazy(() => import("./pages/admin/courses").then(m => ({ default: m.AdminCourses })));
const AdminEmailMarketing = lazy(() => import("./pages/admin/email-marketing").then(m => ({ default: m.AdminEmailMarketing })));
const AdminWebsiteAnalytics = lazy(() => import("./pages/admin/website-analytics").then(m => ({ default: m.AdminWebsiteAnalytics })));
const AdminSettings      = lazy(() => import("./pages/admin/settings").then(m => ({ default: m.AdminSettings })));
const AdminDatabase      = lazy(() => import("./pages/admin/database").then(m => ({ default: m.AdminDatabase })));
const AdminLegal         = lazy(() => import("./pages/admin/legal").then(m => ({ default: m.AdminLegal })));
const StudentDashboard   = lazy(() => import("./pages/student/dashboard").then(m => ({ default: m.StudentDashboard })));
const StudentCourse      = lazy(() => import("./pages/student/course").then(m => ({ default: m.StudentCourse })));
const StudentLocations   = lazy(() => import("./pages/student/locations").then(m => ({ default: m.StudentLocations })));
const StudentAnalyze     = lazy(() => import("./pages/student/analyze").then(m => ({ default: m.StudentAnalyze })));
const StudentProfile     = lazy(() => import("./pages/student/profile").then(m => ({ default: m.StudentProfile })));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const webRouter = createBrowserRouter([
  { path: "/privacy", Component: LegalPage },
  { path: "/terms",   Component: LegalPage },
  { path: "/",                Component: LandingPage },
  { path: "/about",           Component: AboutPage },
  { path: "/course",          Component: CoursePage },
  { path: "/skill-games",     Component: SkillGamesPage },
  { path: "/login",           Component: LoginPage },
  { path: "/signup",          Component: SignupPage },
  { path: "/forgot-password",    Component: ForgotPasswordPage },
  { path: "/reset-password",     Component: ResetPasswordPage },
  { path: "/checkout/success",   Component: CheckoutSuccessPage },
  { path: "/checkout/cancel",    Component: CheckoutCancelPage },
  {
    path: "/course-content",
    element: <RequireAuth><CourseContentPage /></RequireAuth>,
  },
  {
    path: "/admin",
    element: <RequireAuth><AdminDashboardPage /></RequireAuth>,
  },
  // Admin Portal Routes
  { path: "/admin/dashboard", element: <RequireAuth><AdminDashboard /></RequireAuth> },
  { path: "/admin/students",  element: <RequireAuth><AdminStudents /></RequireAuth> },
  { path: "/admin/locations", element: <RequireAuth><AdminLocations /></RequireAuth> },
  { path: "/admin/map",       element: <RequireAuth><AdminMap /></RequireAuth> },
  { path: "/admin/analytics", element: <RequireAuth><AdminAnalytics /></RequireAuth> },
  { path: "/admin/payments",  element: <RequireAuth><AdminPayments /></RequireAuth> },
  { path: "/admin/courses",   element: <RequireAuth><AdminCourses /></RequireAuth> },
  { path: "/admin/email-marketing",    element: <RequireAuth><AdminEmailMarketing /></RequireAuth> },
  { path: "/admin/website-analytics", element: <RequireAuth><AdminWebsiteAnalytics /></RequireAuth> },
  { path: "/admin/settings",        element: <RequireAuth><AdminSettings /></RequireAuth> },
  { path: "/admin/database",        element: <RequireAuth><AdminDatabase /></RequireAuth> },
  { path: "/admin/legal",           element: <RequireAuth><AdminLegal /></RequireAuth> },
  // Student Portal Routes
  { path: "/student/dashboard", element: <RequireAuth><StudentDashboard /></RequireAuth> },
  { path: "/student/course",    element: <RequireAuth><StudentCourse /></RequireAuth> },
  { path: "/student/locations", element: <RequireAuth><StudentLocations /></RequireAuth> },
  { path: "/student/analyze",   element: <RequireAuth><StudentAnalyze /></RequireAuth> },
  { path: "/student/profile",   element: <RequireAuth><StudentProfile /></RequireAuth> },
]);