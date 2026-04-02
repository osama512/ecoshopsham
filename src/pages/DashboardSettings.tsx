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
  const { user } = useAuth();
  const { toast } = useToast();
  const [storeName, setStoreName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
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
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles" as any)
      .upsert({
        id: user.id,
        store_name: storeName.trim(),
        whatsapp_number: whatsapp.trim(),
        updated_at: new Date().toISOString(),
      } as any);

    if (error) {
      toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم حفظ الإعدادات! ✅" });
    }
    setSaving(false);
  };

  const handleCopyLink = () => {
    if (!user) return;
    navigator.clipboard.writeText(`${window.location.origin}/s/${user.id}`);
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
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ الإعدادات
        </Button>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">رابط متجرك العام</h2>
        <p className="text-sm text-muted-foreground">شارك هذا الرابط مع الزبائن لتصفح منتجاتك.</p>
        <div className="flex items-center gap-2">
          <Input readOnly value={user ? `${window.location.origin}/s/${user.id}` : ""} className="text-xs" />
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="shrink-0 gap-1.5">
            {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
            {linkCopied ? "تم النسخ" : "نسخ"}
          </Button>
        </div>
      </Card>

      <Separator />

      <CheckoutSettings />
    </div>
  );
};

export default DashboardSettings;
