import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const TrialBanner = () => {
  const { planType, trialExpired, trialDaysLeft } = useAuth();

  if (planType === "pro" || planType === "enterprise") return null;
  if (trialExpired) return null; // ProtectedRoute handles this

  return (
    <Alert className="border-warning/50 bg-warning/10 mb-4">
      <Clock className="h-4 w-4 text-warning" />
      <AlertDescription className="text-sm font-medium flex items-center justify-between flex-wrap gap-2">
        <span>
          فترة التجربة: <strong>{trialDaysLeft} يوم متبقي</strong>. قم بالترقية إلى Pro للاحتفاظ بجميع المزايا.
        </span>
        <Link
          to="/dashboard/settings"
          className="inline-flex items-center gap-1 text-xs font-semibold bg-secondary text-secondary-foreground px-3 py-1 rounded-full hover:bg-secondary/90 transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          ترقية الآن
        </Link>
      </AlertDescription>
    </Alert>
  );
};

export default TrialBanner;
