import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MerchantProfile {
  id: string;
  store_name: string | null;
  whatsapp_number: string | null;
  created_at: string | null;
  role: string | null;
  status: string | null;
  plan_type: string | null;
}

const PLAN_OPTIONS = [
  { value: "free", label: "مجانية" },
  { value: "pro", label: "Pro ⭐" },
  { value: "enterprise", label: "Enterprise 🏢" },
];

const TRIAL_DAYS = 7;

const getTrialDaysLeft = (createdAt: string | null) => {
  if (!createdAt) return 0;
  const diff = TRIAL_DAYS - (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(diff));
};

const getMerchantDisplayName = (merchant: MerchantProfile) =>
  merchant.store_name?.trim() || "إعداد المتجر قيد الانتظار";

const getMerchantStatus = (
  merchant: MerchantProfile
): { label: string; variant: "secondary" | "destructive" | "outline" } => {
  if ((merchant.status || "active") === "suspended") {
    return { label: "موقوف", variant: "destructive" };
  }

  if (merchant.plan_type === "pro" || merchant.plan_type === "enterprise") {
    return { label: "نشط", variant: "outline" };
  }

  return getTrialDaysLeft(merchant.created_at) > 0
    ? { label: "تجريبي", variant: "secondary" }
    : { label: "انتهت التجربة", variant: "destructive" };
};

const AdminMerchants = () => {
  const [merchants, setMerchants] = useState<MerchantProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMerchants = async () => {
    setLoading(true);

    const { data, error } = await (supabase.from("profiles" as any) as any)
      .select("id, store_name, whatsapp_number, created_at, role, status, plan_type")
      .eq("role", "merchant")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "خطأ في جلب التجار", description: error.message, variant: "destructive" });
      setMerchants([]);
    } else {
      setMerchants((data as MerchantProfile[]) ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchMerchants();
  }, []);

  const updatePlan = async (merchantId: string, newPlan: string) => {
    const { error } = await (supabase.from("profiles" as any) as any)
      .update({ plan_type: newPlan } as any)
      .eq("id", merchantId);
    if (error) {
      toast({ title: "خطأ في تحديث الباقة", description: error.message, variant: "destructive" });
    } else {
      const planLabel = PLAN_OPTIONS.find((p) => p.value === newPlan)?.label ?? newPlan;
      toast({ title: `تم تحديث الباقة إلى ${planLabel}` });
      fetchMerchants();
    }
  };

  const toggleStatus = async (merchant: MerchantProfile) => {
    setTogglingId(merchant.id);
    const newStatus = (merchant.status || "active") === "active" ? "suspended" : "active";
    const { error } = await (supabase.from("profiles" as any) as any)
      .update({ status: newStatus } as any)
      .eq("id", merchant.id);

    if (error) {
      toast({ title: "خطأ في تحديث الحالة", description: error.message, variant: "destructive" });
    } else {
      toast({ title: newStatus === "suspended" ? "تم إيقاف التاجر" : "تم تفعيل التاجر" });
      fetchMerchants();
    }
    setTogglingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">التجار</h1>
        <p className="text-sm text-muted-foreground">{merchants.length} تاجر مسجّل</p>
      </div>

      <Card className="hidden overflow-hidden overflow-x-auto sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم المتجر</TableHead>
              <TableHead>واتساب</TableHead>
              <TableHead>الباقة</TableHead>
              <TableHead>التجربة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ الانضمام</TableHead>
              <TableHead>إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchants.map((merchant) => {
              const isSuspended = (merchant.status || "active") === "suspended";
              const daysLeft = getTrialDaysLeft(merchant.created_at);
              const isPaid = merchant.plan_type === "pro" || merchant.plan_type === "enterprise";
              const statusBadge = getMerchantStatus(merchant);

              return (
                <TableRow key={merchant.id}>
                  <TableCell className="font-medium">{getMerchantDisplayName(merchant)}</TableCell>
                  <TableCell className="font-mono text-sm">{merchant.whatsapp_number || "—"}</TableCell>
                  <TableCell>
                    <Select value={merchant.plan_type || "free"} onValueChange={(value) => updatePlan(merchant.id, value)}>
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAN_OPTIONS.map((plan) => (
                          <SelectItem key={plan.value} value={plan.value}>{plan.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {isPaid ? (
                      <Badge variant="outline" className="text-xs">مدفوعة</Badge>
                    ) : daysLeft > 0 ? (
                      <Badge variant="secondary" className="text-xs">{daysLeft} يوم متبقي</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">منتهية</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadge.variant} className="text-xs">
                      {statusBadge.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {merchant.created_at ? new Date(merchant.created_at).toLocaleDateString("ar-SY") : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={isSuspended ? "default" : "destructive"}
                      size="sm"
                      className="text-xs"
                      disabled={togglingId === merchant.id}
                      onClick={() => toggleStatus(merchant)}
                    >
                      {togglingId === merchant.id ? <Loader2 className="h-3 w-3 animate-spin" /> : isSuspended ? "تفعيل" : "إيقاف"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <div className="block space-y-3 sm:hidden">
        {merchants.map((merchant) => {
          const isSuspended = (merchant.status || "active") === "suspended";
          const daysLeft = getTrialDaysLeft(merchant.created_at);
          const isPaid = merchant.plan_type === "pro" || merchant.plan_type === "enterprise";
          const statusBadge = getMerchantStatus(merchant);

          return (
            <Card key={`${merchant.id}-mobile`} className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-sm">{getMerchantDisplayName(merchant)}</span>
                <div className="flex items-center gap-1.5">
                  {isPaid ? (
                    <Badge variant="outline" className="text-xs">مدفوعة</Badge>
                  ) : daysLeft > 0 ? (
                    <Badge variant="secondary" className="text-xs">{daysLeft} يوم</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">منتهية</Badge>
                  )}
                  <Badge variant={statusBadge.variant} className="text-xs">
                    {statusBadge.label}
                  </Badge>
                </div>
              </div>
              <p className="font-mono text-xs text-muted-foreground">{merchant.whatsapp_number || "—"}</p>
              <Select value={merchant.plan_type || "free"} onValueChange={(value) => updatePlan(merchant.id, value)}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((plan) => (
                    <SelectItem key={plan.value} value={plan.value}>{plan.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {merchant.created_at ? new Date(merchant.created_at).toLocaleDateString("ar-SY") : "—"}
                </span>
                <Button
                  variant={isSuspended ? "default" : "destructive"}
                  size="sm"
                  className="text-xs"
                  disabled={togglingId === merchant.id}
                  onClick={() => toggleStatus(merchant)}
                >
                  {togglingId === merchant.id ? <Loader2 className="h-3 w-3 animate-spin" /> : isSuspended ? "تفعيل" : "إيقاف"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminMerchants;
