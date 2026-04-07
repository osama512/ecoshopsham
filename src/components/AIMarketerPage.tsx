import { useState } from "react";
import { Sparkles, Facebook, Copy, Check, Loader2, Link2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const GEMINI_API_KEY = "AIzaSyC8JBguVdq5keMPhNBB1aRBpAmeiTHVr0M";

const AD_ANGLES = [
  "ركّز على الجودة العالية والخامة الممتازة للمنتج",
  "ركّز على السعر المناسب والعرض اللي ما بيتعوض",
  "ركّز على الإحساس والتجربة اللي رح يعيشها الزبون",
  "ركّز على التميّز وإن المنتج مش موجود بكل مكان",
  "ركّز على الهدية المثالية والمناسبات",
  "ركّز على الاستخدام اليومي وكيف رح يسهّل حياة الزبون",
];

const FALLBACK_TEMPLATES = [
  "يا أكابر، [اسم_المنتج] صار متوفر عنا وبسعر لقطة [السعر] ليرة بس! الجودة نخب أول والقطع عم تخلص بسرعة. لا تضيعوا الفرصة واطلبوا هلق بضغطة زر! 🔥🇸🇾",
  "الفخامة بتفاصيلها.. [اسم_المنتج] قطعة بتكمل طلتك وبتعطيك الهيبة اللي بتستحقها. السعر [السعر] ليرة والجودة بتضمنلك التميز. اطلبها هلق لتوصلك لعند الباب! ✨⌚",
  "تنبيه لعشاق الأناقة! [اسم_المنتج] وصل لعنا بكمية محدودة جداً. السعر [السعر] ليرة والتوصيل متاح. اطلب هلق قبل ما تخلص الكمية ونقولك راحت عليك! 🚀📦",
  "بدك هدية بتبيض الوجة؟ [اسم_المنتج] هو الخيار المثالي. فخامة، جودة، وسعر مدروس [السعر] ليرة. جهز حالك لتفاجئ اللي بتحبهم واطلبها هلق! 🎁❤️",
];

const pickFallback = (productInfo: string): string => {
  const template = FALLBACK_TEMPLATES[Math.floor(Math.random() * FALLBACK_TEMPLATES.length)];
  // Try to extract name and price from user input
  const lines = productInfo.split("\n").map(l => l.trim()).filter(Boolean);
  const productName = lines[0] || "المنتج";
  const priceMatch = productInfo.match(/(\d[\d,\.]*)/);
  const price = priceMatch ? priceMatch[1] : "---";
  return template.replace("[اسم_المنتج]", productName).replace("[السعر]", price);
};

const buildPrompt = (productInfo: string) => {
  const angle = AD_ANGLES[Math.floor(Math.random() * AD_ANGLES.length)];
  const timestamp = Date.now();

  return `أنت مسوّق سوري محترف على السوشال ميديا. مطلوب منك تكتب إعلان فريد وجذاب لفيسبوك وإنستغرام.

قواعد صارمة:
- استخدم لهجة سورية طبيعية (شامية أو حلبية حسب السياق)
- لا تستخدم أبداً عبارة "يا أكابر أحلى العروض عنا" أو أي قالب جاهز مكرر
- كل إعلان لازم يكون مختلف تماماً عن اللي قبله
- استخدم إيموجي بشكل ذكي (مش كتير)
- اكتب بأسلوب يخلّي الزبون يحس إنو لازم يطلب هلق
- خلّي الإعلان جاهز للنشر مباشرة مع فواصل أسطر واضحة
- أضف دعوة لاتخاذ إجراء (اطلب عالواتساب أو راسلنا)

الزاوية التسويقية لهالإعلان: ${angle}

معلومات المنتج:
${productInfo}

رقم عشوائي للتنويع: ${timestamp}

اكتب الإعلان مباشرة بدون أي مقدمة أو شرح:`;
};

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
      setGenerated(pickFallback(input.trim()));
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const body = {
        contents: [{
          parts: [{ text: buildPrompt(input.trim()) }]
        }],
        generationConfig: {
          temperature: 1.2,
          topP: 0.95,
          topK: 40,
        }
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        console.error("Gemini API error:", res.status);
        useFallback();
        return;
      }

      const data = await res.json();
      const adText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (adText && adText.trim().length > 0) {
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
