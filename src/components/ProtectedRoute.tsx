import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Ban, Clock } from "lucide-react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, role, merchantStatus, trialExpired } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Admin should go to admin portal, not merchant dashboard
  if (role === "admin") return <Navigate to="/admin" replace />;

  if (merchantStatus === "suspended") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-sm">
          <Ban className="h-16 w-16 mx-auto text-destructive opacity-60" />
          <h1 className="text-xl font-display font-bold">تم إيقاف حسابك</h1>
          <p className="text-sm text-muted-foreground">
            تم إيقاف حسابك من قبل إدارة المنصة. يرجى التواصل مع الدعم لمزيد من المعلومات.
          </p>
        </div>
      </div>
    );
  }

  if (trialExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-sm">
          <Clock className="h-16 w-16 mx-auto text-warning opacity-60" />
          <h1 className="text-xl font-display font-bold">انتهت الفترة التجريبية</h1>
          <p className="text-sm text-muted-foreground">
            انتهت فترة التجربة المجانية (7 أيام). يرجى الترقية إلى باقة Pro أو Enterprise لمتابعة استخدام المنصة.
          </p>
          <p className="text-xs text-muted-foreground">تواصل مع إدارة المنصة للترقية.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
