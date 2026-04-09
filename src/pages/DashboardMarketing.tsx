import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Percent, Trash2, Plus, MessageCircle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  active: boolean;
  created_at: string;
}

const DashboardMarketing = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  // Coupons
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState("");
  const [savingCoupon, setSavingCoupon] = useState(false);

  // Past customers
  const [customers, setCustomers] = useState<{ name: string; phone: string; lastOrder: string }[]>([]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const load = async () => {
      setLoading(true);
      await Promise.all([fetchCoupons(), fetchCustomers()]);
      setLoading(false);
    };

    const fetchCoupons = async () => {
      const { data } = await (supabase.from("coupons") as any)
        .select("*")
        .eq("merchant_id", userId)
        .order("created_at", { ascending: false });
      setCoupons(data ?? []);
    };

    const fetchCustomers = async () => {
      const { data } = await (supabase.from("orders") as any)
        .select("customer_name, customer_phone, created_at")
        .eq("merchant_id", userId)
        .order("created_at", { ascending: false });
      if (data) {
        const seen = new Map<string, { name: string; phone: string; lastOrder: string }>();
        (data as any[]).forEach((o) => {
          const key = o.customer_phone || o.customer_name;
          if (!seen.has(key)) {
            seen.set(key, { name: o.customer_name, phone: o.customer_phone, lastOrder: o.created_at });
          }
        });
        setCustomers(Array.from(seen.values()));
      }
    };

    load();
  }, [user?.id]);

  const addCoupon = async () => {
    if (!newCode.trim() || !newDiscount) return;
    const discount = Number(newDiscount);
    if (discount <= 0 || discount > 100) {
      toast({ title: "خطأ", description: "نسبة الخصم يجب أن تكون بين 1 و 100", variant: "destructive" });
      return;
    }
    setSavingCoupon(true);
    const { error } = await (supabase.from("coupons") as any).insert({
      merchant_id: user!.id,
      code: newCode.trim().toUpperCase(),
      discount_percent: discount,
      active: true,
    });
    setSavingCoupon(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم إنشاء الكوبون بنجاح ✅" });
    setNewCode("");
    setNewDiscount("");
    const { data } = await (supabase.from("coupons") as any)
      .select("*")
      .eq("merchant_id", user!.id)
      .order("created_at", { ascending: false });
    setCoupons(data ?? []);
  };

  const deleteCoupon = async (id: string) => {
    await (supabase.from("coupons") as any).delete().eq("id", id);
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "تم حذف الكوبون" });
  };

  const messageCustomer = (phone: string) => {
    const num = phone.replace(/[^0-9]/g, "");
    const msg = encodeURIComponent("مرحباً! لدينا عروض جديدة في متجرنا على SyriaBiz 🎉 تفضل بزيارة المتجر!");
    window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">أدوات التسويق</h2>

      {/* Coupon Manager */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            إدارة الكوبونات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">رمز الكوبون</Label>
              <Input
                placeholder="مثال: SYRIA10"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                maxLength={20}
              />
            </div>
            <div className="w-full sm:w-28 space-y-1">
              <Label className="text-xs">الخصم %</Label>
              <Input
                type="number"
                min={1}
                max={100}
                placeholder="10"
                value={newDiscount}
                onChange={(e) => setNewDiscount(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addCoupon} disabled={savingCoupon} size="sm" className="gap-1 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                إضافة
              </Button>
            </div>
          </div>

          {coupons.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد كوبونات بعد</p>
          ) : (
            <div className="space-y-2">
              {coupons.map((c) => (
                <div key={c.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-sm">{c.code}</Badge>
                    <span className="text-sm font-bold text-primary">{c.discount_percent}%</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteCoupon(c.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Customers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            العملاء السابقون
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا يوجد عملاء بعد</p>
          ) : (
            <div className="space-y-2">
              {customers.map((c, i) => (
                <div key={i} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => messageCustomer(c.phone)}>
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">مراسلة</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardMarketing;
