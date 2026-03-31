import { useState } from "react";
import { Sparkles, Facebook, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const API_KEY = "AIzaSyCoUF_AEkXH2KxMIVCfn53Emp7mIgd2zTg";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
const FALLBACK_AD = "يا أكابر، أحلى العروض عنا وبأسعار لقطة ما بتتعوض! جودة نخب أول وشغل بيرفع الراس. للطلب والاستفسار تواصلوا معنا عالواتساب وأبشروا بالخير! 🔥🇸🇾";

const AIMarketerPage = () => {
  const [input, setInput] = useState("");
  const [generated, setGenerated] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setGenerated("");

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: "You are a professional Syrian marketer. Write a Facebook ad in Syrian dialect. Use catchy local slang like (يا أكابر، عروض نار، خامة بتجنن، سعر لقطة). Avoid formal Arabic. Use emojis and include a call to action to order via WhatsApp.\n\nWrite a Facebook ad for this product:\n\n" + input.trim() },
              ],
            },
          ],
        }),
      });

      const data = await res.json();
      console.log("Gemini API response:", data);
      if (!res.ok) console.error("Gemini API error:", res.status, data);
      const text = res.ok ? (data?.candidates?.[0]?.content?.parts?.[0]?.text || FALLBACK_AD) : FALLBACK_AD;
      setGenerated(text);
    } catch {
      setGenerated(FALLBACK_AD);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold">AI Marketer</h1>
        <p className="text-sm text-muted-foreground">Generate ads for your products instantly using AI</p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-secondary">
          <Sparkles className="h-5 w-5" />
          <span className="font-semibold text-sm">What product do you want to market?</span>
        </div>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. صابون حلبي طبيعي بزيت الزيتون..."
          rows={4}
          className="resize-none"
          disabled={loading}
        />
        <Button
          onClick={handleGenerate}
          disabled={!input.trim() || loading}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-semibold"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4" />}
          {loading ? "Generating..." : "Generate Facebook Ad"}
        </Button>
      </Card>

      {generated && (
        <Card className="p-4 space-y-3 border-secondary/30 bg-secondary/5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-secondary" />
              Generated Ad
            </span>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs h-8">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <p className="text-sm whitespace-pre-line leading-relaxed" dir="auto">{generated}</p>
        </Card>
      )}
    </div>
  );
};

export default AIMarketerPage;
