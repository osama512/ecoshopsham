import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, LogIn } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate(role === "admin" ? "/admin" : "/dashboard", { replace: true });
    }
  }, [user, role]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let loginEmail = email;

    // If logging in with phone, look up email from profiles
    if (!loginEmail && phone) {
      const cleaned = phone.replace(/[\s\-\+]/g, "").replace(/[^0-9]/g, "");
      const { data: profileData } = await (supabase.from("profiles" as any) as any)
        .select("email")
        .or(`phone.eq.${cleaned},phone.eq.0${cleaned.replace(/^963/, "")},phone.eq.963${cleaned.replace(/^0/, "")}`)
        .limit(1)
        .maybeSingle();

      if (!profileData?.email) {
        toast({ title: "لم يتم العثور على حساب بهذا الرقم", variant: "destructive" });
        setLoading(false);
        return;
      }
      loginEmail = profileData.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });

    if (error) {
      toast({ title: "فشل تسجيل الدخول", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      const userRole = (profile as any)?.role ?? "merchant";
      navigate(userRole === "admin" ? "/admin" : "/dashboard", { replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold">
            Syria<span className="text-secondary">Biz</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">سجّل دخولك</p>
        </div>

        <Card className="p-6">
          <Tabs defaultValue="phone" className="w-full" dir="rtl">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="phone">رقم الهاتف</TabsTrigger>
              <TabsTrigger value="email">البريد الإلكتروني</TabsTrigger>
            </TabsList>

            <form onSubmit={handleLogin} className="space-y-4">
              <TabsContent value="phone" className="mt-0 space-y-2">
                <Label htmlFor="login-phone">رقم الهاتف</Label>
                <Input
                  id="login-phone"
                  type="tel"
                  dir="ltr"
                  placeholder="09xxxxxxxx"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setEmail(""); }}
                  className="text-left"
                />
              </TabsContent>

              <TabsContent value="email" className="mt-0 space-y-2">
                <Label htmlFor="login-email">البريد الإلكتروني</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="merchant@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setPhone(""); }}
                />
              </TabsContent>

              <div className="space-y-2">
                <Label htmlFor="login-password">كلمة المرور</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                تسجيل الدخول
              </Button>
            </form>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          ليس لديك حساب؟{" "}
          <Link to="/signup" className="text-secondary font-semibold hover:underline">إنشاء حساب</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
