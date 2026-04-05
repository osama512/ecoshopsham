import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Users, Package, Loader2, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminOverview = () => {
  const [merchantCount, setMerchantCount] = useState<number | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [pendingOrders, setPendingOrders] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [profilesRes, productsRes, ordersRes, pendingRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "merchant"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      setMerchantCount(profilesRes.count ?? 0);
      setProductCount(productsRes.count ?? 0);
      setOrderCount(ordersRes.count ?? 0);
      setPendingOrders(pendingRes.count ?? 0);
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = [
    { label: "إجمالي التجار", value: merchantCount, icon: Users, color: "primary" },
    { label: "إجمالي المنتجات", value: productCount, icon: Package, color: "secondary" },
    { label: "إجمالي الطلبات", value: orderCount, icon: ShoppingBag, color: "success" },
    { label: "طلبات قيد الانتظار", value: pendingOrders, icon: ShoppingBag, color: "warning" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">نظرة عامة</h1>
        <p className="text-sm text-muted-foreground">إحصائيات المنصة</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 flex flex-col items-center text-center gap-2">
            <div className={`h-10 w-10 rounded-full bg-${s.color}/10 flex items-center justify-center`}>
              <s.icon className={`h-5 w-5 text-${s.color}`} />
            </div>
            <p className="text-3xl font-display font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminOverview;
