import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Coins } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CURRENCY_OPTIONS,
  DEFAULT_STORE_CURRENCY,
  formatStorePrice,
  type CurrencyCode,
  type CurrencyDisplayMode,
  type StoreCurrency,
} from "@/lib/currency";
import { parseStoreTheme } from "@/lib/storeTheme";

const StoreCurrencySettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState<StoreCurrency>({ ...DEFAULT_STORE_CURRENCY });

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("store_settings" as any)
        .select("theme")
        .eq("merchant_id", userId)
        .maybeSingle();
      if (data) {
        setCurrency(parseStoreTheme((data as any).theme).currency);
      }
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user) return;
    if (currency.rate <= 0) {
      toast({ title: "أدخل سعر تحويل أكبر من صفر", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: existing } = await supabase
      .from("store_settings" as any)
      .select("theme")
      .eq("merchant_id", user.id)
      .maybeSingle();
    const current = parseStoreTheme((existing as any)?.theme);
    const nextTheme = { ...current, currency };

    const { error } = await (supabase.from("store_settings") as any).upsert(
      {
        merchant_id: user.id,
        theme: nextTheme,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "merchant_id" },
    );

    if (error) {
      toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم حفظ إعدادات العملة! ✅" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Card className="p-5 flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-5">
      <div>
        <h2 className="font-semibold flex items-center gap-2">
          <Coins className="h-4 w-4 text-secondary" />
          العملة والأسعار
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          أسعار المنتجات تُحفظ بعملة الأساس. يمكنك عرضها كما هي، أو تحويلها بعملة ثانية بسعر ثابت تدخله أنت، أو عرض العملتين معاً.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>عملة الأسعار (الأساس)</Label>
          <Select
            value={currency.base}
            onValueChange={(v) => setCurrency((c) => ({ ...c, base: v as CurrencyCode }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((o) => (
                <SelectItem key={o.code} value={o.code}>
                  {o.label} ({o.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>طريقة العرض</Label>
          <Select
            value={currency.display_mode}
            onValueChange={(v) =>
              setCurrency((c) => ({ ...c, display_mode: v as CurrencyDisplayMode }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="base">عملة الأساس فقط</SelectItem>
              <SelectItem value="convert">تحويل إلى عملة ثانية</SelectItem>
              <SelectItem value="dual">عرض العملتين معاً</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {(currency.display_mode === "convert" || currency.display_mode === "dual") && (
        <div className="grid sm:grid-cols-2 gap-4 rounded-md border p-3 bg-muted/30">
          <div className="space-y-2">
            <Label>العملة الثانية</Label>
            <Select
              value={currency.secondary}
              onValueChange={(v) => setCurrency((c) => ({ ...c, secondary: v as CurrencyCode }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.filter((o) => o.code !== currency.base).map((o) => (
                  <SelectItem key={o.code} value={o.code}>
                    {o.label} ({o.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>
              سعر التحويل الثابت (١ {currency.secondary} = ؟ {currency.base})
            </Label>
            <Input
              type="number"
              min={0.0001}
              step="any"
              dir="ltr"
              value={currency.rate}
              onChange={(e) =>
                setCurrency((c) => ({ ...c, rate: parseFloat(e.target.value) || 0 }))
              }
            />
            <p className="text-xs text-muted-foreground">
              مثال: إذا 1 دولار = 15000 ل.س فأدخل 15000 (أساس ل.س، ثانية USD).
            </p>
          </div>
        </div>
      )}

      <div className="rounded-md border p-3 text-sm space-y-1">
        <p className="text-muted-foreground text-xs">معاينة لسعر 100,000 بوحدة الأساس:</p>
        <p className="font-display font-bold text-secondary">
          {formatStorePrice(100000, currency)}
        </p>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        حفظ العملة
      </Button>
    </Card>
  );
};

export default StoreCurrencySettings;
