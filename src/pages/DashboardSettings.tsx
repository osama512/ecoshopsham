import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Link2, Check } from "lucide-react";

const DashboardSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [storeName, setStoreName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
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
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings saved! ✅" });
    }
    setSaving(false);
  };

  const handleCopyLink = () => {
    if (!user) return;
    navigator.clipboard.writeText(`${window.location.origin}/s/${user.id}`);
    setLinkCopied(true);
    toast({ title: "Store link copied! ✅" });
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
        <h1 className="text-2xl font-display font-bold">Store Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your store profile</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="storeName">Store Name</Label>
          <Input id="storeName" placeholder="My Syrian Shop" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp Number</Label>
          <Input id="whatsapp" placeholder="+963912345678" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          <p className="text-xs text-muted-foreground">Include country code. Customers will use this to order.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </Button>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Your Public Store Link</h2>
        <p className="text-sm text-muted-foreground">Share this link with customers so they can browse your products.</p>
        <div className="flex items-center gap-2">
          <Input readOnly value={user ? `${window.location.origin}/s/${user.id}` : ""} className="text-xs" />
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="shrink-0 gap-1.5">
            {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
            {linkCopied ? "Copied" : "Copy"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DashboardSettings;
