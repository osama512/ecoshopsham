import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import Index from "./pages/Index";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import DashboardProducts from "./pages/DashboardProducts";
import DashboardOrders from "./pages/DashboardOrders";
import DashboardAI from "./pages/DashboardAI";
import DashboardSettings from "./pages/DashboardSettings";
import DashboardAnalytics from "./pages/DashboardAnalytics";
import DashboardMarketing from "./pages/DashboardMarketing";
import AdminDashboard from "./pages/AdminDashboard";
import AdminOverview from "./pages/AdminOverview";
import AdminMerchants from "./pages/AdminMerchants";
import AdminPlans from "./pages/AdminPlans";

import Storefront from "./pages/Storefront";
import ProductDetails from "./pages/ProductDetails";
import StoreInfoPage from "./pages/StoreInfoPage";
import NotFound from "./pages/NotFound";
import { isCustomDomainHost } from "@/lib/customDomain";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

/** Redirect authenticated users based on role (platform host only) */
const RoleRedirect = () => {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Index />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
};

/** On a merchant custom domain, "/" is the storefront */
const CustomDomainHome = () => {
  const host = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
  return <Storefront storeKey={host} />;
};

const AppRoutes = () => {
  const onCustomDomain = isCustomDomainHost();

  if (onCustomDomain) {
    return (
      <Routes>
        <Route path="/" element={<CustomDomainHome />} />
        <Route path="/p/:slug" element={<ProductDetails />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/info/:pageSlug" element={<StoreInfoPage />} />
        <Route path="/s/:storeId" element={<Storefront />} />
        <Route path="/s/:storeId/info/:pageSlug" element={<StoreInfoPage />} />
        <Route path="*" element={<CustomDomainHome />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/s/:storeId" element={<Storefront />} />
      <Route path="/s/:storeId/info/:pageSlug" element={<StoreInfoPage />} />
      <Route path="/p/:slug" element={<ProductDetails />} />
      <Route path="/product/:id" element={<ProductDetails />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard/products" replace />} />
        <Route path="products" element={<DashboardProducts />} />
        <Route path="orders" element={<DashboardOrders />} />
        <Route path="ai" element={<DashboardAI />} />
        <Route path="analytics" element={<DashboardAnalytics />} />
        <Route path="marketing" element={<DashboardMarketing />} />
        <Route path="settings" element={<DashboardSettings />} />
      </Route>
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="merchants" element={<AdminMerchants />} />
        <Route path="plans" element={<AdminPlans />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

import { CartProvider } from "@/contexts/CartContext";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
