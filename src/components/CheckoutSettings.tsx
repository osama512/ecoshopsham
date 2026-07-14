import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

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
  { id: "shamcash", name: "شام كاش", details: "", enabled: false },
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

  // Sham Cash private credentials
  const [shamcashWallet, setShamcashWallet] = useState("");
  const [shamcashApiKey, setShamcashApiKey] = useState("");
  const [shamcashApiKeyConfigured, setShamcashApiKeyConfigured] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const fetchSettings = async () => {
      setLoading(true);
      const [{ data }, { data: sc }] = await Promise.all([
        supabase
          .from("store_settings" as any)
          .select("*")
          .eq("merchant_id", userId)
          .maybeSingle(),
        (supabase.from("merchant_shamcash" as any) as any)
          .select("wallet_address, api_key, enabled")
          .eq("merchant_id", userId)
          .maybeSingle(),
      ]);

      if (data) {
        const d = data as any;
        if (d.shipping_zones) setShippingZones(d.shipping_zones);

        const pm = d.payment_methods;
        if (Array.isArray(pm)) {
          const merged = DEFAULT_METHODS.map((dm) => {
            const saved = pm.find((p: PaymentMethodEntry) => p.id === dm.id);
            return saved ? { ...dm, ...saved } : dm;
          });
          const custom = pm.filter(
            (p: PaymentMethodEntry) => !DEFAULT_METHODS.some((dm) => dm.id === p.id)
          );
          // Sync enabled flag from private table if present
          const withSc = merged.map((m) =>
            m.id === "shamcash" && sc
              ? { ...m, enabled: !!sc.enabled }
              : m
          );
          setPaymentMethods([...withSc, ...custom]);
        } else if (pm && typeof pm === "object") {
          setPaymentMethods(
            DEFAULT_METHODS.map((m) => ({
              ...m,
              enabled:
                m.id === "shamcash" && sc
                  ? !!sc.enabled
                  : (pm[m.id] ?? m.enabled),
            }))
          );
        } else if (sc?.enabled) {
          setPaymentMethods(
            DEFAULT_METHODS.map((m) =>
              m.id === "shamcash" ? { ...m, enabled: true } : m
            )
          );
        }
      } else if (sc?.enabled) {
        setPaymentMethods(
          DEFAULT_METHODS.map((m) =>
            m.id === "shamcash" ? { ...m, enabled: true } : m
          )
        );
      }

      if (sc) {
        setShamcashWallet(sc.wallet_address || "");
        setShamcashApiKeyConfigured(!!sc.api_key);
        setShamcashApiKey(""); // never echo full key into the form
      }

      setLoading(false);
    };

    fetchSettings();
  }, [user?.id]);

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
      toast({ title: "يجب إظهار طريقة دفع واحدة على الأقل للزبائن", variant: "destructive" });
      return;
    }

    const shamcashEnabled = paymentMethods.find((m) => m.id === "shamcash")?.enabled;
    if (shamcashEnabled) {
      if (!shamcashWallet.trim()) {
        toast({ title: "أدخل عنوان محفظة شام كاش", variant: "destructive" });
        return;
      }
      if (!shamcashApiKeyConfigured && !shamcashApiKey.trim()) {
        toast({ title: "أدخل مفتاح API الخاص بشام كاش", variant: "destructive" });
        return;
      }
    }

    setSaving(true);

    // Persist methods without secrets; shamcash details stay empty publicly
    const publicMethods = paymentMethods.map((m) =>
      m.id === "shamcash" ? { ...m, details: "" } : m
    );

    const { error } = await (supabase.from("store_settings") as any).upsert(
      {
        merchant_id: user.id,
        payment_methods: publicMethods,
        shipping_zones: shippingZones,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "merchant_id" }
    );

    if (error) {
      setSaving(false);
      toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" });
      return;
    }

    // Save / clear Sham Cash credentials in private table
    if (shamcashEnabled) {
      const payload: Record<string, unknown> = {
        merchant_id: user.id,
        wallet_address: shamcashWallet.trim(),
        enabled: true,
        updated_at: new Date().toISOString(),
      };
      if (shamcashApiKey.trim()) {
        payload.api_key = shamcashApiKey.trim();
      } else if (!shamcashApiKeyConfigured) {
        setSaving(false);
        toast({ title: "أدخل مفتاح API الخاص بشام كاش", variant: "destructive" });
        return;
      }

      // If api_key not being updated, fetch existing then upsert full row
      if (!shamcashApiKey.trim() && shamcashApiKeyConfigured) {
        const { data: existing } = await (supabase.from("merchant_shamcash" as any) as any)
          .select("api_key")
          .eq("merchant_id", user.id)
          .maybeSingle();
        if (existing?.api_key) payload.api_key = existing.api_key;
      }

      const { error: scError } = await (supabase.from("merchant_shamcash" as any) as any).upsert(
        payload,
        { onConflict: "merchant_id" }
      );

      if (scError) {
        setSaving(false);
        toast({
          title: "خطأ في حفظ إعدادات شام كاش",
          description: scError.message,
          variant: "destructive",
        });
        return;
      }
      setShamcashApiKeyConfigured(true);
      setShamcashApiKey("");
    } else {
      // Disable without deleting credentials (merchant can re-enable later)
      await (supabase.from("merchant_shamcash" as any) as any)
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq("merchant_id", user.id);
    }

    toast({ title: "تم حفظ إعدادات الدفع والشحن! ✅" });
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

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">طرق الدفع</h3>
        <p className="text-xs text-muted-foreground">
          أظهر أو أخفِ كل طريقة للزبائن عند الطلب. الإخفاء لا يحذف الإعدادات — يمكنك إظهارها لاحقاً.
        </p>
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={cn(
                "space-y-2 rounded-md border p-4 transition-opacity",
                !method.enabled && "opacity-60 bg-muted/30"
              )}
            >
              <div className="flex flex-row items-center justify-between w-full gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="text-sm font-medium truncate">{method.name}</span>
                  <span
                    className={cn(
                      "text-[10px] rounded-full px-2 py-0.5 shrink-0 border",
                      method.enabled
                        ? "bg-green-600/10 text-green-700 border-green-600/20"
                        : "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    {method.enabled ? "ظاهر" : "مخفي"}
                  </span>
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
                <div className="flex items-center gap-2 shrink-0">
                  <Label
                    htmlFor={`pay-vis-${method.id}`}
                    className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap"
                  >
                    إظهار للزبائن
                  </Label>
                  <Switch
                    id={`pay-vis-${method.id}`}
                    checked={method.enabled}
                    onCheckedChange={() => toggleMethod(method.id)}
                    aria-label={method.enabled ? `إخفاء ${method.name}` : `إظهار ${method.name}`}
                  />
                </div>
              </div>

              {method.id === "shamcash" && (
                <div className="space-y-3 rounded-md border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground">
                    من لوحة شام كاش: انسخ عنوان المحفظة ومفتاح API (`sk_...`). المفتاح يُحفظ بشكل خاص ولا يظهر للزبائن.
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">عنوان المحفظة *</Label>
                    <Input
                      placeholder="UUID أو عنوان المحفظة (32 hex) أو رقم الحساب"
                      value={shamcashWallet}
                      onChange={(e) => setShamcashWallet(e.target.value)}
                      className="text-sm font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      مفتاح API *
                      {shamcashApiKeyConfigured && !shamcashApiKey && (
                        <span className="text-muted-foreground font-normal mr-1">
                          (محفوظ — اتركه فارغاً للإبقاء عليه)
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        placeholder={shamcashApiKeyConfigured ? "••••••••••••••••" : "sk_..."}
                        value={shamcashApiKey}
                        onChange={(e) => setShamcashApiKey(e.target.value)}
                        className="text-sm font-mono pr-10"
                        dir="ltr"
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowApiKey((v) => !v)}
                      >
                        {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {method.id !== "shamcash" && (
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
