import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AffiliateProvider } from "@/contexts/AffiliateContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import MembershipGuard from "@/components/MembershipGuard";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import CoOwnerDashboard from "./pages/CoOwnerDashboard";
import ComingSoon from "./pages/ComingSoon";
import ResetPassword from "./pages/ResetPassword";
import MembershipCheckout from "./pages/MembershipCheckout";
import MembershipRenew from "./pages/MembershipRenew";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import CourseLearn from "./pages/CourseLearn";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import WhitelabelDashboard from "./pages/WhitelabelDashboard";
import AffiliateDashboard from "./pages/AffiliateDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AffiliateProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:slug" element={<CourseDetail />} />
              <Route
                path="/courses/:slug/learn"
                element={
                  <ProtectedRoute>
                    <CourseLearn />
                  </ProtectedRoute>
                }
              />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/membership/checkout"
                element={
                  <ProtectedRoute>
                    <MembershipCheckout />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/membership/renew"
                element={
                  <ProtectedRoute>
                    <MembershipRenew />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <MembershipGuard>
                      <Dashboard />
                    </MembershipGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/affiliate"
                element={
                  <ProtectedRoute>
                    <AffiliateDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/co-owner"
                element={
                  <ProtectedRoute allowedRoles={["co_owner"]}>
                    <MembershipGuard>
                      <CoOwnerDashboard />
                    </MembershipGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/whitelabel"
                element={
                  <ProtectedRoute allowedRoles={["whitelabel_owner"]}>
                    <MembershipGuard>
                      <WhitelabelDashboard />
                    </MembershipGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/coming-soon"
                element={
                  <ProtectedRoute allowedRoles={["referrer", "white_label_owner", "whitelabel_owner"]}>
                    <MembershipGuard>
                      <ComingSoon />
                    </MembershipGuard>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AffiliateProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
