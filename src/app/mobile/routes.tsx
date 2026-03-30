import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { useAuth } from "../contexts/auth";

// Public pages — loaded eagerly
import { LandingPage } from "../web/pages/public/landing-page";
import { CoursePage } from "../web/pages/public/course-page";
import { LoginPage } from "../web/pages/public/login-page";
import { SignupPage } from "../web/pages/public/signup-page";
import { ForgotPasswordPage } from "../web/pages/public/forgot-password";
import { ResetPasswordPage } from "../web/pages/public/reset-password";
import { CheckoutSuccessPage } from "../web/pages/public/checkout-success";
import { CheckoutCancelPage } from "../web/pages/public/checkout-cancel";
import { AboutPage } from "../web/pages/public/about-page";

// Protected pages — lazy loaded
const CourseContentPage = lazy(() => import("../web/pages/public/course-content-page").then(m => ({ default: m.CourseContentPage })));
const AdminDashboardPage = lazy(() => import("../web/pages/admin/dashboard-page").then(m => ({ default: m.AdminDashboardPage })));
const AdminDashboard     = lazy(() => import("../web/pages/admin/dashboard").then(m => ({ default: m.AdminDashboard })));
const AdminStudents      = lazy(() => import("../web/pages/admin/students").then(m => ({ default: m.AdminStudents })));
const AdminLocations     = lazy(() => import("../web/pages/admin/locations").then(m => ({ default: m.AdminLocations })));
const AdminMap           = lazy(() => import("../web/pages/admin/map").then(m => ({ default: m.AdminMap })));
const AdminAnalytics     = lazy(() => import("../web/pages/admin/analytics").then(m => ({ default: m.AdminAnalytics })));
const AdminPayments      = lazy(() => import("../web/pages/admin/payments").then(m => ({ default: m.AdminPayments })));
const AdminCourses       = lazy(() => import("../web/pages/admin/courses").then(m => ({ default: m.AdminCourses })));
const AdminActivity      = lazy(() => import("../web/pages/admin/activity").then(m => ({ default: m.AdminActivity })));
const AdminSettings      = lazy(() => import("../web/pages/admin/settings").then(m => ({ default: m.AdminSettings })));
const StudentDashboard   = lazy(() => import("./pages/student/dashboard").then(m => ({ default: m.StudentDashboard })));
const StudentCourse      = lazy(() => import("../web/pages/student/course").then(m => ({ default: m.StudentCourse })));
const StudentLocations   = lazy(() => import("../web/pages/student/locations").then(m => ({ default: m.StudentLocations })));
const StudentAnalyze     = lazy(() => import("../web/pages/student/analyze").then(m => ({ default: m.StudentAnalyze })));
const StudentProfile     = lazy(() => import("../web/pages/student/profile").then(m => ({ default: m.StudentProfile })));

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

export const mobileRouter = createBrowserRouter([
  { path: "/",                Component: LandingPage },
  { path: "/about",           Component: AboutPage },
  { path: "/course",          Component: CoursePage },
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
  { path: "/admin/activity",  element: <RequireAuth><AdminActivity /></RequireAuth> },
  { path: "/admin/settings",  element: <RequireAuth><AdminSettings /></RequireAuth> },
  // Student Portal Routes
  { path: "/student/dashboard", element: <RequireAuth><StudentDashboard /></RequireAuth> },
  { path: "/student/course",    element: <RequireAuth><StudentCourse /></RequireAuth> },
  { path: "/student/locations", element: <RequireAuth><StudentLocations /></RequireAuth> },
  { path: "/student/analyze",   element: <RequireAuth><StudentAnalyze /></RequireAuth> },
  { path: "/student/profile",   element: <RequireAuth><StudentProfile /></RequireAuth> },
]);
