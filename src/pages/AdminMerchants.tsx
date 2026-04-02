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
  created_at: string;
  role: string | null;
  status: string | null;
  plan_type: string | null;
}

const AdminMerchants = () => {
  const [merchants, setMerchants] = useState<MerchantProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMerchants = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setMerchants((data as any as MerchantProfile[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMerchants();
  }, []);

  const updatePlan = async (merchantId: string, newPlan: string) => {
    const { error } = await (supabase
      .from("profiles" as any) as any)
      .update({ plan_type: newPlan } as any)
      .eq("id", merchantId);
    if (error) {
      toast({ title: "خطأ في تحديث الباقة", description: error.message, variant: "destructive" });
    } else {
      toast({ title: newPlan === "pro" ? "تمت الترقية إلى Pro ⭐" : "تم التخفيض إلى المجانية" });
      fetchMerchants();
    }
  };

  const toggleStatus = async (merchant: MerchantProfile) => {
    setTogglingId(merchant.id);
    const newStatus = (merchant.status || "active") === "active" ? "suspended" : "active";
    const { error } = await (supabase
      .from("profiles" as any) as any)
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
      <Card className="overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم المتجر</TableHead>
              <TableHead>واتساب</TableHead>
              <TableHead>الباقة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ الانضمام</TableHead>
              <TableHead>إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchants.map((m) => {
              const status = m.status || "active";
              const isSuspended = status === "suspended";
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.store_name || "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{m.whatsapp_number || "—"}</TableCell>
                  <TableCell>
                    <Select
                      value={m.plan_type || "free"}
                      onValueChange={(val) => updatePlan(m.id, val)}
                    >
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">مجانية</SelectItem>
                        <SelectItem value="pro">Pro ⭐</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isSuspended ? "destructive" : "outline"} className="text-xs">
                      {isSuspended ? "موقوف" : "نشط"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(m.created_at).toLocaleDateString("ar-SY")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={isSuspended ? "default" : "destructive"}
                      size="sm"
                      className="text-xs"
                      disabled={togglingId === m.id}
                      onClick={() => toggleStatus(m)}
                    >
                      {togglingId === m.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isSuspended ? "تفعيل" : "إيقاف"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile cards for small screens */}
      <div className="block sm:hidden space-y-3">
        {merchants.map((m) => {
          const status = m.status || "active";
          const isSuspended = status === "suspended";
          return (
            <Card key={m.id + "-mobile"} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{m.store_name || "—"}</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant={m.plan_type === "pro" ? "default" : "secondary"} className="text-xs">
                    {m.plan_type === "pro" ? "Pro" : "مجانية"}
                  </Badge>
                  <Badge variant={isSuspended ? "destructive" : "outline"} className="text-xs">
                    {isSuspended ? "موقوف" : "نشط"}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{m.whatsapp_number || "—"}</p>
              <Select value={m.plan_type || "free"} onValueChange={(val) => updatePlan(m.id, val)}>
                <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">مجانية</SelectItem>
                  <SelectItem value="pro">Pro ⭐</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString("ar-SY")}</span>
                <Button
                  variant={isSuspended ? "default" : "destructive"}
                  size="sm"
                  className="text-xs"
                  disabled={togglingId === m.id}
                  onClick={() => toggleStatus(m)}
                >
                  {togglingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : isSuspended ? "تفعيل" : "إيقاف"}
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
