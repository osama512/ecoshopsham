import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Eye, EyeOff } from "lucide-react";
import { isValidPhone, phoneToAuthEmail } from "@/lib/phone";

const Signup = () => {
  const [tab, setTab] = useState<"phone" | "email">("phone");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (tab === "phone") {
      if (!isValidPhone(phone)) {
        toast({ title: "رقم الهاتف غير صالح", description: "مثال: 0912345678 أو +1234567890", variant: "destructive" });
        setLoading(false);
        return;
      }
    }

    // Supabase requires email — deterministic placeholder for phone-only signups
    const signupEmail = tab === "email" ? email.trim() : phoneToAuthEmail(phone);

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

    // Supabase may return a user with empty identities when the email already exists
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      toast({
        title: "الحساب موجود مسبقاً",
        description: "جرّب تسجيل الدخول بنفس البيانات",
        variant: "destructive",
      });
      setLoading(false);
      navigate("/login");
      return;
    }

    if (data.user) {
      await (supabase.from("profiles" as any) as any).upsert({
        id: data.user.id,
        role: "merchant",
        status: "active",
        plan_type: "free",
        email: tab === "email" ? email.trim() : null,
        phone: tab === "phone" ? phone : null,
        updated_at: new Date().toISOString(),
      } as any);
    }

    if (data.session) {
      toast({ title: "تم إنشاء الحساب بنجاح! ✅" });
      navigate("/dashboard", { replace: true });
    } else if (tab === "email") {
      toast({
        title: "تحقق من بريدك",
        description: "أرسلنا رابط تأكيد. بعد التفعيل سجّل الدخول.",
      });
      navigate("/login");
    } else {
      // Phone account created but Auth still requires confirmation (no session)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: signupEmail,
        password,
      });
      if (signInError) {
        toast({
          title: "تم إنشاء الحساب لكن تفعيله مطلوب",
          description: "فعّل الحساب من Authentication في Supabase أو نفّذ سكربت التأكيد التلقائي، ثم سجّل الدخول.",
          variant: "destructive",
        });
        navigate("/login");
      } else {
        toast({ title: "تم إنشاء الحساب بنجاح! ✅" });
        navigate("/dashboard", { replace: true });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-display font-bold flex items-center justify-center gap-2">
            <img src="/favicon.png?v=2" alt="" className="h-8 w-8 rounded-md" />
            ecoshop<span className="text-secondary">sham</span>
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
                  placeholder="09xxxxxxxx أو +1234567890"
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

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 pl-10"
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
