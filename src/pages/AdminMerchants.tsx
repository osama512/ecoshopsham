import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface MerchantProfile {
  id: string;
  store_name: string | null;
  whatsapp_number: string | null;
  created_at: string;
  role: string | null;
}

const AdminMerchants = () => {
  const [merchants, setMerchants] = useState<MerchantProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      setMerchants((data as any as MerchantProfile[]) ?? []);
      setLoading(false);
    };
    fetch();
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
        <h1 className="text-2xl font-display font-bold">Merchants</h1>
        <p className="text-sm text-muted-foreground">{merchants.length} registered merchants</p>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store Name</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchants.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.store_name || "—"}</TableCell>
                <TableCell className="font-mono text-sm">{m.whatsapp_number || "—"}</TableCell>
                <TableCell className="capitalize">{m.role || "merchant"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(m.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminMerchants;
