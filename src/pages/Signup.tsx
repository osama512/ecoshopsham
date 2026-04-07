import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";
import { isValidSyrianPhone, formatSyrianWhatsApp } from "@/lib/phone";

const Signup = () => {
  const [tab, setTab] = useState<"phone" | "email">("phone");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (tab === "phone") {
      if (!isValidSyrianPhone(phone)) {
        toast({ title: "رقم الهاتف غير صالح", description: "مثال: 0912345678", variant: "destructive" });
        setLoading(false);
        return;
      }
    }

    // Supabase requires email — generate unique placeholder for phone-only signups
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const signupEmail = tab === "email" ? email : `${formatSyrianWhatsApp(phone)}_${uniqueId}@phone.syriabiz.local`;

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { signup_method: tab === "phone" ? "phone" : "email" },
      },
    });

    if (error) {
      const isRateLimit = error.message?.toLowerCase().includes("rate limit") || error.status === 429;
      toast({
        title: isRateLimit ? "تم تجاوز الحد المسموح" : "فشل إنشاء الحساب",
        description: isRateLimit
          ? "لقد قمت بعدة محاولات، يرجى الانتظار قليلاً أو التواصل مع الدعم"
          : error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (data.user) {
      await (supabase.from("profiles" as any) as any).upsert({
        id: data.user.id,
        role: "merchant",
        status: "active",
        plan_type: "free",
        email: tab === "email" ? email : null,
        phone: tab === "phone" ? phone : null,
        updated_at: new Date().toISOString(),
      } as any);
    }

    toast({ title: "تم إنشاء الحساب بنجاح! ✅" });
    navigate("/login");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-display font-bold">
            Syria<span className="text-secondary">Biz</span>
          </h1>
          <p className="text-sm text-muted-foreground">إنشاء حساب تاجر جديد</p>
        </div>

        <Card className="p-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "phone" | "email")} dir="rtl">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="phone">برقم الهاتف</TabsTrigger>
              <TabsTrigger value="email">بالبريد الإلكتروني</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSignup} className="space-y-5">
              <TabsContent value="phone" className="mt-0">
                <Input
                  type="tel"
                  dir="ltr"
                  placeholder="09xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-left h-11"
                  required={tab === "phone"}
                />
              </TabsContent>

              <TabsContent value="email" className="mt-0">
                <Input
                  type="email"
                  placeholder="merchant@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  required={tab === "email"}
                />
              </TabsContent>

              <Input
                type="password"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11"
              />

              <Button type="submit" className="w-full h-11 gap-2 text-base" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                إنشاء حساب
              </Button>
            </form>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          لديك حساب؟{" "}
          <Link to="/login" className="text-secondary font-semibold hover:underline">دخول</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
