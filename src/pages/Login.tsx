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
import { Loader2, LogIn, Eye, EyeOff } from "lucide-react";
import { phoneToAuthEmail } from "@/lib/phone";

function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("email not confirmed") || m.includes("not confirmed")) {
    return "الحساب غير مفعّل بعد. إن سجّلت برقم الهاتف، نفّذ تفعيل الحسابات من لوحة Supabase أو تواصل مع الدعم.";
  }
  if (m.includes("invalid login credentials") || m.includes("invalid credentials")) {
    return "رقم الهاتف/البريد أو كلمة المرور غير صحيحة.";
  }
  return message;
}

const Login = () => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    let loginEmail = email.trim();

    // Same deterministic email used at phone signup
    if (!loginEmail && phone) {
      loginEmail = phoneToAuthEmail(phone);
    }

    if (!loginEmail) {
      toast({
        title: "بيانات ناقصة",
        description: "أدخل رقم الهاتف أو البريد الإلكتروني",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });

    if (error) {
      toast({
        title: "فشل تسجيل الدخول",
        description: authErrorMessage(error.message),
        variant: "destructive",
      });
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
          <h1 className="text-2xl font-display font-bold flex items-center justify-center gap-2">
            <img src="/favicon.png?v=2" alt="" className="h-8 w-8 rounded-md" />
            ecoshop<span className="text-secondary">sham</span>
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
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
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
