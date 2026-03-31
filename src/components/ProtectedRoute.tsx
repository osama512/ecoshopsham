import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Ban } from "lucide-react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, merchantStatus } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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

  return <>{children}</>;
};

export default ProtectedRoute;
