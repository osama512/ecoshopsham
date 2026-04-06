import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      toast({ title: "فشل إنشاء الحساب", description: error.message, variant: "destructive" });
    } else {
      if (data.user) {
        const { error: profileError } = await (supabase.from("profiles" as any) as any).upsert({
          id: data.user.id,
          role: "merchant",
          status: "active",
          plan_type: "free",
          updated_at: new Date().toISOString(),
        } as any);

        if (profileError) {
          toast({
            title: "تم إنشاء الحساب",
            description: "تم إنشاء الحساب لكن تعذر تهيئة ملف التاجر الآن، وسيُعاد إنشاؤه عند تسجيل الدخول.",
          });
        } else {
          toast({ title: "تم إنشاء الحساب! تحقق من بريدك الإلكتروني للتأكيد." });
        }
      } else {
        toast({ title: "تم إنشاء الحساب! تحقق من بريدك الإلكتروني للتأكيد." });
      }
      navigate("/login");
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
          <p className="text-sm text-muted-foreground mt-1">أنشئ حساب التاجر الخاص بك</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="merchant@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                placeholder="٦ أحرف على الأقل"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              إنشاء حساب
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{" "}
          <Link to="/login" className="text-secondary font-semibold hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
