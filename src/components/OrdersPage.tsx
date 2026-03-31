import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, CheckCircle2, Truck, XCircle } from "lucide-react";

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: "Pending", className: "bg-warning/15 text-warning border-warning/30", icon: Clock },
  processing: { label: "Processing", className: "bg-primary/10 text-primary border-primary/30", icon: Truck },
  completed: { label: "Completed", className: "bg-success/15 text-success border-success/30", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", className: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
};

const mockOrders = [
  { id: "ORD-001", customer: "Ahmad Khalil", items: 3, total: 15200, status: "pending", date: "Today, 2:30 PM" },
  { id: "ORD-002", customer: "Fatima Hassan", items: 1, total: 35000, status: "processing", date: "Today, 11:00 AM" },
  { id: "ORD-003", customer: "Omar Yousef", items: 5, total: 28500, status: "completed", date: "Yesterday" },
  { id: "ORD-004", customer: "Layla Mahmoud", items: 2, total: 9700, status: "completed", date: "Yesterday" },
  { id: "ORD-005", customer: "Khaled Nour", items: 1, total: 4500, status: "cancelled", date: "Mar 28" },
  { id: "ORD-006", customer: "Sara Deeb", items: 4, total: 42000, status: "pending", date: "Mar 28" },
];

const OrdersPage = () => {
  const pendingCount = mockOrders.filter(o => o.status === "pending").length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">{pendingCount} pending · {mockOrders.length} total</p>
      </div>

      <div className="space-y-3">
        {mockOrders.map((order) => {
          const config = statusConfig[order.status];
          const StatusIcon = config.icon;
          return (
            <Card key={order.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{order.customer}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {order.id} · {order.items} item{order.items > 1 ? "s" : ""} · {order.date}
                  </p>
                </div>
                <Badge variant="outline" className={`${config.className} gap-1 text-[11px] font-medium`}>
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="font-display font-bold">{order.total.toLocaleString()} SYP</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default OrdersPage;
