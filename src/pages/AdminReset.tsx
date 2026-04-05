import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const CONFIRM_TEXT = "أريد حذف كل البيانات";

const AdminReset = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [confirmInput, setConfirmInput] = useState("");
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (confirmInput !== CONFIRM_TEXT) {
      toast({ title: "يرجى كتابة نص التأكيد بالضبط", variant: "destructive" });
      return;
    }
    if (!user) return;

    setResetting(true);

    try {
      // Delete in order: orders → coupons → products → store_settings → profiles (non-admin)
      await supabase.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await (supabase.from("coupons") as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await (supabase.from("store_settings") as any).delete().neq("merchant_id", "00000000-0000-0000-0000-000000000000");

      // Delete non-admin profiles (keep admin)
      await (supabase.from("profiles") as any).delete().neq("role", "admin");

      toast({ title: "تم مسح جميع البيانات بنجاح! 🗑️" });
      setConfirmInput("");
    } catch (err: any) {
      toast({ title: "خطأ أثناء الحذف", description: err.message, variant: "destructive" });
    }

    setResetting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">إعادة تعيين بيانات النظام</h1>
        <p className="text-sm text-muted-foreground">حذف جميع البيانات التجريبية لتحضير المنصة للإطلاق</p>
      </div>

      <Alert className="border-destructive/50 bg-destructive/10">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-sm">
          <strong>تحذير:</strong> سيتم حذف جميع التجار والمنتجات والطلبات والكوبونات نهائياً. حساب المدير فقط سيبقى. هذا الإجراء لا يمكن التراجع عنه.
        </AlertDescription>
      </Alert>

      <Card className="p-5 space-y-4 max-w-lg">
        <h3 className="font-semibold text-destructive">ما سيتم حذفه:</h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>جميع حسابات التجار وملفاتهم الشخصية</li>
          <li>جميع المنتجات وصورها</li>
          <li>جميع الطلبات</li>
          <li>جميع الكوبونات</li>
          <li>جميع إعدادات المتاجر</li>
        </ul>

        <div className="space-y-2 pt-2">
          <Label className="text-sm">
            اكتب <span className="font-bold text-destructive">"{CONFIRM_TEXT}"</span> للتأكيد:
          </Label>
          <Input
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={CONFIRM_TEXT}
            dir="rtl"
          />
        </div>

        <Button
          variant="destructive"
          className="w-full gap-2"
          disabled={confirmInput !== CONFIRM_TEXT || resetting}
          onClick={handleReset}
        >
          {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          حذف جميع البيانات
        </Button>
      </Card>
    </div>
  );
};

export default AdminReset;
