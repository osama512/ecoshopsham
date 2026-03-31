import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Users, Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminOverview = () => {
  const [merchantCount, setMerchantCount] = useState<number | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [profilesRes, productsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
      ]);
      setMerchantCount(profilesRes.count ?? 0);
      setProductCount(productsRes.count ?? 0);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Admin Overview</h1>
        <p className="text-sm text-muted-foreground">Platform statistics at a glance</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Merchants</p>
            <p className="text-3xl font-display font-bold">{merchantCount}</p>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
            <Package className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Products</p>
            <p className="text-3xl font-display font-bold">{productCount}</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;
