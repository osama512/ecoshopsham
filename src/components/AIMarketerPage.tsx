import { useState } from "react";
import { Sparkles, Facebook, Copy, Check, Loader2, Link2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const AD_ANGLES = [
  "ركّز على الجودة العالية والخامة الممتازة",
  "ركّز على السعر المناسب والعرض المميز",
  "ركّز على الإحساس والتجربة العاطفية",
  "ركّز على التميّز والحصرية",
  "ركّز على الهدية المثالية",
  "ركّز على الاستخدام اليومي والعملية",
];

const extractFunctionErrorMessage = async (error: unknown): Promise<string> => {
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: unknown }).context;

    if (context instanceof Response) {
      const payload = await context.clone().json().catch(() => null);

      if (payload && typeof payload === "object" && "error" in payload) {
        const message = (payload as { error?: unknown }).error;
        if (typeof message === "string" && message.trim()) return message;
      }

      const text = await context.text().catch(() => "");
      if (text.trim()) return text;
    }
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  if (typeof error === "string" && error.trim()) return error;

  return "Unknown error";
};

const AIMarketerPage = () => {
  const [input, setInput] = useState("");
  const [generated, setGenerated] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const showGenerateError = (message: string) => {
    setGenerated("");
    setErrorMessage(message);
    toast({
      title: "فشل توليد الإعلان",
      description: message,
      variant: "destructive",
    });
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setGenerated("");
    setErrorMessage("");

    try {
      const angle = AD_ANGLES[Math.floor(Math.random() * AD_ANGLES.length)];
      const payload = { productDescription: input.trim(), angle };
      console.log("generate-ad payload:", payload);

      const { data, error } = await supabase.functions.invoke("generate-ad", {
        body: payload,
      });

      if (error) {
        const message = await extractFunctionErrorMessage(error);
        console.error("Edge function error:", message, error);
        showGenerateError(message);
        return;
      }

      if (data?.error && typeof data.error === "string") {
        console.error("Generate ad backend error:", data.error);
        showGenerateError(data.error);
        return;
      }

      const adText = typeof data?.ad === "string" ? data.ad.trim() : "";

      if (!adText) {
        showGenerateError("Empty AI response");
        return;
      }

      setGenerated(adText);
    } catch (err) {
      const message = await extractFunctionErrorMessage(err);
      console.error("Generate ad error:", message, err);
      showGenerateError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyStoreLink = () => {
    const storePath = storeSlug || user?.id?.replace(/-/g, "").slice(0, 6) || "store";
    const link = `${window.location.origin}/s/${storePath}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    toast({ title: "تم نسخ رابط المتجر! ✅" });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">المسوّق الذكي</h1>
          <p className="text-sm text-muted-foreground">أنشئ إعلانات فريدة لمنتجاتك فوراً بالذكاء الاصطناعي</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs self-start"
          onClick={handleCopyStoreLink}
        >
          {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
          {linkCopied ? "تم النسخ" : "نسخ رابط المتجر"}
        </Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-secondary">
          <Sparkles className="h-5 w-5" />
          <span className="font-semibold text-sm">وصف المنتج (الاسم، التفاصيل، السعر...)</span>
        </div>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"مثال: ساعة Curren أصلية، ماكينة يابانية، ضد المي، زجاج ضد الخدش، السعر 150 ألف..."}
          rows={5}
          className="resize-none"
          disabled={loading}
        />
        {input.trim().length > 0 && input.trim().length < 30 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            💡 نصيحة: مشان يطلع الإعلان دسم وبيجيب زباين، اكتبلنا شوية تفاصيل زيادة (متل الماكينة، اللون، الميزات، والسعر...)
          </p>
        )}
        <Button
          onClick={handleGenerate}
          disabled={!input.trim() || loading}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-semibold"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4" />}
          {loading ? "عم يجهزلك الإعلان..." : "إنشاء إعلان فيسبوك"}
        </Button>
      </Card>

      {loading && (
        <Card className="p-4 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">الذكاء الاصطناعي عم يكتبلك إعلان نار... 🔥</span>
        </Card>
      )}

      {errorMessage && !loading && (
        <Card className="p-4 space-y-3 border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="font-semibold text-sm">رسالة الخطأ الحقيقية</span>
          </div>
          <p className="text-sm whitespace-pre-line leading-relaxed" dir="auto">{errorMessage}</p>
        </Card>
      )}

      {generated && !loading && (
        <Card className="p-4 space-y-3 border-secondary/30 bg-secondary/5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-secondary" />
              الإعلان الجاهز
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={handleGenerate} className="gap-1.5 text-xs h-8" title="توليد نسخة جديدة">
                <RefreshCw className="h-3.5 w-3.5" />
                نسخة جديدة
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs h-8">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "تم النسخ!" : "نسخ"}
              </Button>
            </div>
          </div>
          <p className="text-sm whitespace-pre-line leading-relaxed" dir="auto">{generated}</p>
        </Card>
      )}
    </div>
  );
};

export default AIMarketerPage;