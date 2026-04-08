import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Link2, Check, Crown, Sparkles } from "lucide-react";
import CheckoutSettings from "@/components/CheckoutSettings";

const DashboardSettings = () => {
  const { user, storeSlug: contextSlug, refetchProfile } = useAuth();
  const { toast } = useToast();
  const [storeName, setStoreName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [planType, setPlanType] = useState("free");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles" as any)
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setStoreName((data as any).store_name || "");
        setWhatsapp((data as any).whatsapp_number || "");
        setPlanType((data as any).plan_type || "free");
        setStoreSlug((data as any).store_slug || "");
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const slugValue = storeSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-") || null;

    if (slugValue) {
      const { data: existing } = await supabase
        .from("profiles" as any)
        .select("id")
        .eq("store_slug", slugValue)
        .neq("id", user.id)
        .maybeSingle();

      if (existing) {
        toast({ title: "عذراً، هذا الرابط مستخدم من قبل متجر آخر. يرجى اختيار اسم مختلف.", variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from("profiles" as any)
      .upsert({
        id: user.id,
        store_name: storeName.trim(),
        whatsapp_number: whatsapp.trim(),
        store_slug: slugValue,
        updated_at: new Date().toISOString(),
      } as any);

    if (error) {
      toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم حفظ الإعدادات! ✅" });
      await refetchProfile();
    }
    setSaving(false);
  };

  const storeLink = (() => {
    if (!user) return "";
    const slug = storeSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
    const path = slug || user.id.replace(/-/g, "").slice(0, 6);
    return `${window.location.origin}/s/${path}`;
  })();

  const handleCopyLink = () => {
    if (!user) return;
    navigator.clipboard.writeText(storeLink);
    setLinkCopied(true);
    toast({ title: "تم نسخ رابط المتجر! ✅" });
    setTimeout(() => setLinkCopied(false), 2000);
  };

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
        <h1 className="text-2xl font-display font-bold">إعدادات المتجر</h1>
        <p className="text-sm text-muted-foreground">إدارة ملف المتجر الخاص بك</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="storeName">اسم المتجر</Label>
          <Input id="storeName" placeholder="متجري السوري" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsapp">رقم الواتساب</Label>
          <Input id="whatsapp" placeholder="+963912345678" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          <p className="text-xs text-muted-foreground">أضف رمز الدولة. سيستخدمه الزبائن للطلب.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="storeSlug">رابط المتجر المخصص</Label>
          <div className="flex items-center gap-0 rounded-md border border-input overflow-hidden" dir="ltr">
            <span className="bg-muted px-3 py-2 text-xs text-muted-foreground whitespace-nowrap border-r border-input select-none">
              {window.location.host}/s/
            </span>
            <input
              id="storeSlug"
              className="flex-1 h-10 bg-background px-3 py-2 text-sm outline-none"
              placeholder="amen-watches"
              value={storeSlug}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
                setStoreSlug(val);
              }}
              dir="ltr"
            />
          </div>
          {storeSlug && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(storeSlug) && storeSlug.length > 1 && (
            <p className="text-xs text-destructive">يجب أن يبدأ وينتهي بحرف أو رقم، بدون مسافات أو أحرف عربية.</p>
          )}
          <p className="text-xs text-muted-foreground">أحرف إنجليزية صغيرة، أرقام وشرطات فقط.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ الإعدادات
        </Button>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">رابط متجرك العام</h2>
        <p className="text-sm text-muted-foreground">شارك هذا الرابط مع الزبائن لتصفح منتجاتك.</p>
        <div className="flex items-center gap-2">
          <Input readOnly value={storeLink} className="text-xs" dir="ltr" />
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="shrink-0 gap-1.5">
            {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
            {linkCopied ? "تم النسخ" : "نسخ"}
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            {planType === "pro" ? <Crown className="h-4 w-4 text-yellow-500" /> : <Sparkles className="h-4 w-4 text-muted-foreground" />}
            باقة الاشتراك
          </h2>
          <Badge variant={planType === "pro" ? "default" : "secondary"} className="text-sm px-3 py-1">
            {planType === "pro" ? "Pro ⭐" : "مجانية"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {planType === "pro"
            ? "أنت على الباقة الاحترافية — منتجات غير محدودة ومزايا متقدمة."
            : "الباقة المجانية — حتى 10 منتجات. تواصل مع الإدارة للترقية."}
        </p>
      </Card>

      <Separator />

      <CheckoutSettings />
    </div>
  );
};

export default DashboardSettings;
