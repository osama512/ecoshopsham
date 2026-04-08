import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";

interface ShippingZone {
  id: string;
  name: string;
  price: number;
}

const METHOD_PLACEHOLDERS: Record<string, string> = {
  syriatel_cash: "رقم الحساب أو الموبايل (مثال: 0997...)",
  haram_transfer: "الاسم الثلاثي والرقم الوطني للمستلم",
  cash: "ملاحظات إضافية للتوصيل (اختياري)",
};

interface PaymentMethodEntry {
  id: string;
  name: string;
  details: string;
  enabled: boolean;
}

const DEFAULT_METHODS: PaymentMethodEntry[] = [
  { id: "syriatel_cash", name: "سيريتل كاش / MTN كاش", details: "", enabled: false },
  { id: "haram_transfer", name: "شركة الهرم / الفؤاد", details: "", enabled: false },
  { id: "cash", name: "دفع عند الاستلام", details: "", enabled: true },
];

const CheckoutSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodEntry[]>(DEFAULT_METHODS);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZonePrice, setNewZonePrice] = useState("");
  const [newMethodName, setNewMethodName] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("store_settings" as any)
        .select("*")
        .eq("merchant_id", user.id)
        .maybeSingle();

      if (!error && data) {
        const d = data as any;
        if (d.shipping_zones) setShippingZones(d.shipping_zones);

        // Load payment methods from payment_methods JSON or legacy payment_methods config
        const pm = d.payment_methods;
        if (Array.isArray(pm)) {
          // New format: array of PaymentMethodEntry
          const merged = DEFAULT_METHODS.map((dm) => {
            const saved = pm.find((p: PaymentMethodEntry) => p.id === dm.id);
            return saved ? { ...dm, ...saved } : dm;
          });
          const custom = pm.filter(
            (p: PaymentMethodEntry) => !DEFAULT_METHODS.some((dm) => dm.id === p.id)
          );
          setPaymentMethods([...merged, ...custom]);
        } else if (pm && typeof pm === "object") {
          // Legacy format: { cash: true, syriatel_cash: false, ... }
          setPaymentMethods(
            DEFAULT_METHODS.map((m) => ({
              ...m,
              enabled: pm[m.id] ?? m.enabled,
            }))
          );
        }
      }
      setLoading(false);
    };
    fetchSettings();
  }, [user]);

  const toggleMethod = (id: string) => {
    setPaymentMethods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const updateMethodDetails = (id: string, details: string) => {
    setPaymentMethods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, details } : m))
    );
  };

  const addCustomMethod = () => {
    if (!newMethodName.trim()) return;
    setPaymentMethods((prev) => [
      ...prev,
      { id: `custom_${Date.now()}`, name: newMethodName.trim(), details: "", enabled: true },
    ]);
    setNewMethodName("");
  };

  const removeMethod = (id: string) => {
    setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
  };

  const isCustomMethod = (id: string) => !DEFAULT_METHODS.some((dm) => dm.id === id);

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
    const atLeastOne = paymentMethods.some((m) => m.enabled);
    if (!atLeastOne) {
      toast({ title: "يجب تفعيل طريقة دفع واحدة على الأقل", variant: "destructive" });
      return;
    }
    setSaving(true);

    const { error } = await (supabase.from("store_settings") as any).upsert(
      {
        merchant_id: user.id,
        payment_methods: paymentMethods,
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

      {/* Payment Methods with Switch toggles */}
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">طرق الدفع</h3>
        <p className="text-xs text-muted-foreground">فعّل طرق الدفع وأضف تفاصيل الحساب لكل طريقة. ستظهر للزبائن عند الطلب.</p>
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <div key={method.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-3 min-w-0">
                  <Switch
                    checked={method.enabled}
                    onCheckedChange={() => toggleMethod(method.id)}
                    className="shrink-0"
                  />
                  <span className="text-sm font-medium truncate">{method.name}</span>
                </div>
                {isCustomMethod(method.id) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeMethod(method.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {method.enabled && (
                <Input
                  placeholder={METHOD_PLACEHOLDERS[method.id] || "تفاصيل إضافية (اختياري)"}
                  value={method.details}
                  onChange={(e) => updateMethodDetails(method.id, e.target.value)}
                  className="text-sm"
                />
              )}
            </div>
          ))}
        </div>

        {/* Add custom method */}
        <div className="flex gap-2">
          <Input
            placeholder="اسم طريقة دفع أخرى..."
            value={newMethodName}
            onChange={(e) => setNewMethodName(e.target.value)}
            className="text-sm"
          />
          <Button variant="outline" size="sm" onClick={addCustomMethod} disabled={!newMethodName.trim()} className="gap-1 shrink-0">
            <Plus className="h-3.5 w-3.5" />
            إضافة
          </Button>
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
            <Input placeholder="مثال: توصيل داخل دمشق" value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} />
          </div>
          <div className="w-28 space-y-1">
            <Label className="text-xs">السعر (ل.س)</Label>
            <Input type="number" placeholder="15000" value={newZonePrice} onChange={(e) => setNewZonePrice(e.target.value)} />
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
