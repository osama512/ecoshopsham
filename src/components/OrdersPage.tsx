import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, Truck, XCircle, Loader2, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Order } from "@/integrations/supabase/db-types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: "Pending", className: "bg-warning/15 text-warning border-warning/30", icon: Clock },
  processing: { label: "Processing", className: "bg-primary/10 text-primary border-primary/30", icon: Truck },
  completed: { label: "Completed", className: "bg-success/15 text-success border-success/30", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", className: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
};

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast({ title: "Error fetching orders", description: error.message, variant: "destructive" });
      } else {
        setOrders(data ?? []);
      }
      setLoading(false);
    };

    fetchOrders();
  }, []);

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, h:mm a");
    } catch {
      return dateStr;
    }
  };

  const getItemCount = (details: unknown): number => {
    if (Array.isArray(details)) return details.length;
    return 0;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">{pendingCount} pending · {orders.length} total</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No orders yet</p>
          <p className="text-sm">Orders will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const config = statusConfig[order.status] ?? statusConfig.pending;
            const StatusIcon = config.icon;
            const itemCount = getItemCount(order.order_details);
            return (
              <Card key={order.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="font-semibold">{order.customer_name}</span>
                    <p className="text-xs text-muted-foreground">
                      {itemCount} item{itemCount !== 1 ? "s" : ""} · {formatDate(order.created_at)}
                    </p>
                  </div>
                  <Badge variant="outline" className={`${config.className} gap-1 text-[11px] font-medium`}>
                    <StatusIcon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </div>
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="font-display font-bold">{Number(order.total_price).toLocaleString()} SYP</span>
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
