import { useState } from "react";
import { Sparkles, Facebook, Copy, Check, Loader2, Link2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/* ── Modular Fallback Library (Lego-style) ── */
const INTROS = [
  "يا أكابر، شوفوا شو وصل لعنا! 🔥",
  "لعشاق التميز والفخامة.. 💎",
  "تنبيه لكل الناس الشيك! ✨",
  "أخيراً وصل اللي كلكن عم تسألوا عنو! 🚀",
  "فرصة ما بتتكرر يا جماعة! 🎯",
  "عنا شي جديد رح يعجبكن كتير! 💫",
];

const BODIES = [
  "[product_name] صار متوفر عنا وبسعر [price] ليرة بس! الجودة نخب أول والكمية محدودة.",
  "[product_name] اللي الكل عم يحكي عنو، هلق بين إيديكن بسعر [price] ليرة. خامة بتجنن وجودة ما إلها مثيل.",
  "شو رأيكن ب [product_name]؟ سعر مدروس [price] ليرة، وجودة بتخلّيك ترجع تطلب كمان مرة.",
  "[product_name] — القطعة اللي بتكمل طلتك وبتعطيك الهيبة. السعر [price] ليرة والنوعية بتحكي عن حالها.",
  "وصل [product_name] بأفضل سعر بالسوق: [price] ليرة. مصنوع بعناية وجودة ما بتلاقيها بأي مكان تاني.",
];

const OUTROS = [
  "اطلبوه هلق قبل ما تخلص الكمية! 📦\nراسلنا عالواتساب وبيوصلك لعند الباب 🚚",
  "توصيل سريع وخدمة متميزة لكل المحافظات 🇸🇾\nاضغط عالرابط واطلب هلق!",
  "لا تضيّع الفرصة — الكمية عم تخلص بسرعة! ⚡\nتواصل معنا عالواتساب لتطلب",
  "اطلب هلق وخلّي أنت المميز بين رفقاتك! 😎\nالتوصيل متاح لكل سوريا",
  "سارعوا قبل نفاد الكمية — العرض لفترة محدودة! 🔥\nراسلنا عالواتساب واطلب فوراً",
];

function buildModularAd(productInfo: string): string {
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const lines = productInfo.split("\n").map(l => l.trim()).filter(Boolean);
  const productName = lines[0] || "المنتج";
  const priceMatch = productInfo.match(/(\d[\d,\.]*)/);
  const price = priceMatch ? priceMatch[1] : "---";

  const intro = pick(INTROS);
  const body = pick(BODIES).replace("[product_name]", productName).replace("[price]", price);
  const outro = pick(OUTROS);

  return `${intro}\n\n${body}\n\n${outro}`;
}

/* ── Ad Angles for AI variety ── */
const AD_ANGLES = [
  "ركّز على الجودة العالية والخامة الممتازة للمنتج",
  "ركّز على السعر المناسب والعرض اللي ما بيتعوض",
  "ركّز على الإحساس والتجربة اللي رح يعيشها الزبون",
  "ركّز على التميّز وإن المنتج مش موجود بكل مكان",
  "ركّز على الهدية المثالية والمناسبات",
  "ركّز على الاستخدام اليومي وكيف رح يسهّل حياة الزبون",
];

const AIMarketerPage = () => {
  const [input, setInput] = useState("");
  const [generated, setGenerated] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setGenerated("");

    const useFallback = () => {
      setGenerated(buildModularAd(input.trim()));
    };

    try {
      const angle = AD_ANGLES[Math.floor(Math.random() * AD_ANGLES.length)];

      const { data, error } = await supabase.functions.invoke("generate-ad", {
        body: { productDescription: input.trim(), angle },
      });

      if (error) {
        console.error("Edge function error:", error);
        useFallback();
        return;
      }

      if (data?.error === "rate_limited") {
        toast({ title: "يرجى الانتظار قليلاً ثم المحاولة مجدداً ⏳", variant: "destructive" });
        useFallback();
        return;
      }

      const adText = data?.ad;
      if (adText && adText.trim().length > 10) {
        setGenerated(adText.trim());
      } else {
        useFallback();
      }
    } catch (err) {
      console.error("Generate ad error:", err);
      useFallback();
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
    const link = `${window.location.origin}/s/${user?.id || "store"}`;
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
          placeholder={"مثال: صابون حلبي طبيعي بزيت الزيتون\nالسعر: 15,000 ل.س\nمصنوع يدوياً من مواد طبيعية 100%"}
          rows={5}
          className="resize-none"
          disabled={loading}
        />
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
