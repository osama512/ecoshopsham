import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, DollarSign, Clock, TrendingUp, Package } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const DashboardAnalytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, pendingOrders: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProduct, setTopProduct] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const load = async () => {
      setLoading(true);

      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("merchant_id", userId)
        .order("created_at", { ascending: false });

      const allOrders = orders ?? [];
      const total = allOrders.length;
      const revenue = allOrders.reduce((sum, o) => sum + (Number((o as any).total_price) || 0), 0);
      const pending = allOrders.filter((o) => (o as any).status === "pending").length;
      setStats({ totalOrders: total, totalRevenue: revenue, pendingOrders: pending });

      setRecentOrders(allOrders.slice(0, 5));

      // Top product
      const productCount: Record<string, { name: string; count: number }> = {};
      allOrders.forEach((o: any) => {
        const name = o.product_name || "غير معروف";
        if (!productCount[name]) productCount[name] = { name, count: 0 };
        productCount[name].count++;
      });
      const sorted = Object.values(productCount).sort((a, b) => b.count - a.count);
      setTopProduct(sorted[0]?.name ?? null);

      // Chart: orders per day (last 7 days)
      const days: Record<string, number> = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        days[d.toISOString().slice(0, 10)] = 0;
      }
      allOrders.forEach((o: any) => {
        const day = (o.created_at as string)?.slice(0, 10);
        if (day && day in days) days[day]++;
      });
      setChartData(
        Object.entries(days).map(([date, count]) => ({
          date: date.slice(5),
          orders: count,
        }))
      );

      setLoading(false);
    };

    load();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const formatPrice = (v: number) => v.toLocaleString("ar-SY") + " ل.س";

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">إحصائيات المتجر</h2>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><ShoppingCart className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
              <p className="text-xl font-bold">{stats.totalOrders}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><DollarSign className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
              <p className="text-xl font-bold">{formatPrice(stats.totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><Clock className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">طلبات معلّقة</p>
              <p className="text-xl font-bold">{stats.pendingOrders}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><TrendingUp className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">المنتج الأكثر طلباً</p>
              <p className="text-sm font-bold truncate max-w-[120px]">{topProduct ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">الطلبات — آخر 7 أيام</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ orders: { label: "طلبات", color: "hsl(var(--primary))" } }} className="h-[220px] w-full">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="orders" fill="var(--color-orders)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">آخر الطلبات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد طلبات بعد</p>
          ) : (
            recentOrders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{o.product_name}</p>
                    <p className="text-xs text-muted-foreground">{o.customer_name}</p>
                  </div>
                </div>
                <div className="text-left">
                  <Badge variant={o.status === "pending" ? "secondary" : "default"} className="text-xs">
                    {o.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardAnalytics;
