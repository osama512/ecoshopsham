import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";

interface ShippingZone {
  id: string;
  name: string;
  price: number;
}

interface PaymentMethodConfig {
  cash: boolean;
  syriatel_cash: boolean;
  haram_transfer: boolean;
}

const DEFAULT_PAYMENTS: PaymentMethodConfig = {
  cash: true,
  syriatel_cash: false,
  haram_transfer: false,
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "الدفع عند الاستلام",
  syriatel_cash: "سيريتل كاش",
  haram_transfer: "حوالة الهرم",
};

const CheckoutSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payments, setPayments] = useState<PaymentMethodConfig>(DEFAULT_PAYMENTS);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZonePrice, setNewZonePrice] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("store_settings" as any)
        .select("*")
        .eq("merchant_id", user.id)
        .maybeSingle();

      if (!error && data) {
        const d = data as any;
        if (d.payment_methods) setPayments(d.payment_methods);
        if (d.shipping_zones) setShippingZones(d.shipping_zones);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleAddZone = () => {
    if (!newZoneName.trim() || !newZonePrice.trim()) return;
    setShippingZones((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: newZoneName.trim(), price: parseFloat(newZonePrice) },
    ]);
    setNewZoneName("");
    setNewZonePrice("");
  };

  const handleRemoveZone = (id: string) => {
    setShippingZones((prev) => prev.filter((z) => z.id !== id));
  };

  const handleSave = async () => {
    if (!user) return;
    const atLeastOne = Object.values(payments).some(Boolean);
    if (!atLeastOne) {
      toast({ title: "يجب تفعيل طريقة دفع واحدة على الأقل", variant: "destructive" });
      return;
    }
    setSaving(true);

    const { error } = await (supabase.from("store_settings") as any).upsert(
      {
        merchant_id: user.id,
        payment_methods: payments,
        shipping_zones: shippingZones,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "merchant_id" }
    );

    if (error) {
      toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم حفظ إعدادات الدفع والشحن! ✅" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold">إعدادات الدفع والشحن</h2>
        <p className="text-sm text-muted-foreground">خصّص طرق الدفع ومناطق الشحن لمتجرك</p>
      </div>

      {/* Payment Methods */}
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">طرق الدفع</h3>
        <p className="text-xs text-muted-foreground">اختر طرق الدفع التي تقبلها. سيراها الزبائن عند الطلب.</p>
        <div className="space-y-3">
          {(Object.keys(PAYMENT_LABELS) as Array<keyof PaymentMethodConfig>).map((key) => (
            <div key={key} className="flex items-center gap-3 rounded-lg border p-3">
              <Checkbox
                id={`pay-${key}`}
                checked={payments[key]}
                onCheckedChange={(checked) =>
                  setPayments((prev) => ({ ...prev, [key]: !!checked }))
                }
              />
              <Label htmlFor={`pay-${key}`} className="cursor-pointer flex-1 text-sm font-medium">
                {PAYMENT_LABELS[key]}
              </Label>
            </div>
          ))}
        </div>
      </Card>

      {/* Shipping Zones */}
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">مناطق الشحن والتوصيل</h3>
        <p className="text-xs text-muted-foreground">حدد مناطق التوصيل مع أسعارها. سيختار الزبون منطقته عند الطلب.</p>

        {shippingZones.length > 0 && (
          <div className="space-y-2">
            {shippingZones.map((zone) => (
              <div key={zone.id} className="flex items-center gap-2 rounded-lg border p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{zone.name}</p>
                  <p className="text-xs text-muted-foreground">{zone.price.toLocaleString()} ل.س</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleRemoveZone(zone.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">اسم المنطقة</Label>
            <Input
              placeholder="مثال: توصيل داخل دمشق"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
            />
          </div>
          <div className="w-28 space-y-1">
            <Label className="text-xs">السعر (ل.س)</Label>
            <Input
              type="number"
              placeholder="15000"
              value={newZonePrice}
              onChange={(e) => setNewZonePrice(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="shrink-0" onClick={handleAddZone}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        حفظ إعدادات الدفع والشحن
      </Button>
    </div>
  );
};

export default CheckoutSettings;
