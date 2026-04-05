import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, CheckCircle2, Truck, XCircle, Loader2, ShoppingBag, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Order } from "@/integrations/supabase/db-types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: "قيد الانتظار", className: "bg-warning/15 text-warning border-warning/30", icon: Clock },
  confirmed: { label: "مؤكد", className: "bg-primary/10 text-primary border-primary/30", icon: CheckCircle2 },
  reserved: { label: "محجوز", className: "bg-secondary/15 text-secondary border-secondary/30", icon: CheckCircle2 },
  processing: { label: "قيد الشحن", className: "bg-primary/10 text-primary border-primary/30", icon: Truck },
  completed: { label: "مكتمل", className: "bg-success/15 text-success border-success/30", icon: CheckCircle2 },
  cancelled: { label: "ملغى", className: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
};

const statusOptions = [
  { value: "pending", label: "قيد الانتظار" },
  { value: "confirmed", label: "مؤكد" },
  { value: "reserved", label: "محجوز" },
  { value: "processing", label: "قيد الشحن" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغى" },
];

// Statuses that trigger stock deduction
const STOCK_DEDUCT_STATUSES = ["confirmed", "reserved"];

const OrdersPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("merchant_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "خطأ في جلب الطلبات", description: error.message, variant: "destructive" });
    } else {
      setOrders(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const updateStatus = async (orderId: string, newStatus: string, oldStatus: string, orderDetails: unknown) => {
    const { error } = await (supabase.from("orders") as any)
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast({ title: "خطأ في تحديث الحالة", description: error.message, variant: "destructive" });
      return;
    }

    // Auto-deduct stock when moving TO confirmed/reserved FROM a non-deducted status
    const wasDeducted = STOCK_DEDUCT_STATUSES.includes(oldStatus);
    const shouldDeduct = STOCK_DEDUCT_STATUSES.includes(newStatus);

    if (shouldDeduct && !wasDeducted) {
      await deductStock(orderDetails);
    }

    toast({ title: "تم تحديث حالة الطلب ✅" });
    fetchOrders();
  };

  const deductStock = async (orderDetails: unknown) => {
    if (!Array.isArray(orderDetails)) return;
    for (const item of orderDetails) {
      if (!item.product_id) continue;
      const qty = item.quantity || 1;
      // Fetch current stock
      const { data: product } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", item.product_id)
        .single();
      if (product) {
        const currentStock = (product as any).stock_quantity ?? 0;
        const newStock = Math.max(0, currentStock - qty);
        await (supabase.from("products") as any)
          .update({ stock_quantity: newStock })
          .eq("id", item.product_id);
      }
    }
  };

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, h:mm a");
    } catch {
      return dateStr;
    }
  };

  const getOrderDetail = (details: unknown, key: string): string => {
    if (Array.isArray(details) && details[0]) return details[0][key] ?? "";
    return "";
  };

  const exportCSV = () => {
    if (orders.length === 0) return;
    const headers = ["الاسم", "الهاتف", "المنتج", "المدينة", "العنوان", "الدفع", "الإجمالي", "الحالة", "التاريخ"];
    const rows = orders.map((o) => [
      o.customer_name,
      o.customer_phone ?? "",
      getOrderDetail(o.order_details, "product_name"),
      getOrderDetail(o.order_details, "city"),
      getOrderDetail(o.order_details, "address"),
      getOrderDetail(o.order_details, "payment_method"),
      String(o.total_price),
      statusConfig[o.status]?.label ?? o.status,
      formatDate(o.created_at),
    ]);

    const BOM = "\uFEFF";
    const csv = BOM + [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-display font-bold">الطلبات</h1>
          <p className="text-sm text-muted-foreground">{pendingCount} قيد الانتظار · {orders.length} إجمالي</p>
        </div>
        {orders.length > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
            <FileSpreadsheet className="h-4 w-4" />
            تصدير CSV
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">لا توجد طلبات بعد</p>
          <p className="text-sm">ستظهر الطلبات هنا عندما يطلب العملاء من متجرك</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const config = statusConfig[order.status] ?? statusConfig.pending;
            const StatusIcon = config.icon;
            const productName = getOrderDetail(order.order_details, "product_name");
            const city = getOrderDetail(order.order_details, "city");
            const address = getOrderDetail(order.order_details, "address");
            const payment = getOrderDetail(order.order_details, "payment_method");

            return (
              <Card key={order.id} className="p-4 hover:shadow-md transition-shadow space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-semibold block">{order.customer_name}</span>
                    {order.customer_phone && (
                      <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                    )}
                  </div>
                  <Badge variant="outline" className={`${config.className} gap-1 text-[11px] font-medium shrink-0`}>
                    <StatusIcon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </div>

                {productName && (
                  <div className="bg-muted/50 rounded-lg p-2.5 space-y-1 text-xs">
                    <p><span className="text-muted-foreground">المنتج:</span> {productName}</p>
                    {city && <p><span className="text-muted-foreground">المدينة:</span> {city}</p>}
                    {address && <p><span className="text-muted-foreground">العنوان:</span> {address}</p>}
                    {payment && <p><span className="text-muted-foreground">الدفع:</span> {payment}</p>}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">الحالة:</span>
                    <Select
                      value={order.status}
                      onValueChange={(v) => updateStatus(order.id, v, order.status, order.order_details)}
                    >
                      <SelectTrigger className="h-7 text-xs w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-left">
                    <span className="font-display font-bold">{Number(order.total_price).toLocaleString()} ل.س</span>
                    <p className="text-[10px] text-muted-foreground">{formatDate(order.created_at)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
