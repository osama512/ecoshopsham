import { useState } from "react";
import { Sparkles, Facebook, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_AD = "يا أكابر، أحلى العروض عنا وبأسعار لقطة ما بتتعوض! جودة نخب أول وشغل بيرفع الراس. للطلب والاستفسار تواصلوا معنا عالواتساب وأبشروا بالخير! 🔥🇸🇾";

const AIMarketerPage = () => {
  const [input, setInput] = useState("");
  const [generated, setGenerated] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setGenerated("");

    try {
      const { data, error } = await (supabase.rpc as any)("generate_syrian_ad", {
        prompt: input.trim(),
      });

      console.log("Raw RPC Response:", data);
      console.log("Raw RPC Response type:", typeof data);
      console.log("RPC error:", error);

      if (error) {
        console.error("RPC returned error:", JSON.stringify(error));
        setGenerated(FALLBACK_AD);
        return;
      }

      if (data === null || data === undefined) {
        console.warn("RPC returned null/undefined data");
        setGenerated(FALLBACK_AD);
        return;
      }

      // Try to extract the ad text from various possible response shapes
      let adText = FALLBACK_AD;

      // Step 1: If data is a string, try to parse it as JSON
      let parsed: any = data;
      if (typeof data === "string") {
        try {
          parsed = JSON.parse(data);
          console.log("Parsed string data into:", parsed);
        } catch {
          // data is plain text, not JSON — use it directly
          console.log("Data is plain text string");
          if (data.trim().length > 0) {
            adText = data.trim();
            setGenerated(adText);
            return;
          }
        }
      }

      // Step 2: Try Gemini nested structure
      const geminiText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (geminiText && typeof geminiText === "string" && geminiText.trim().length > 0) {
        console.log("Extracted from Gemini structure:", geminiText);
        adText = geminiText.trim();
      }
      // Step 3: Check for a direct .ad property
      else if (parsed?.ad && typeof parsed.ad === "string") {
        adText = parsed.ad.trim();
      }
      // Step 4: If parsed is a plain string
      else if (typeof parsed === "string" && parsed.trim().length > 0) {
        adText = parsed.trim();
      } else {
        console.warn("Could not extract ad text. Full parsed data:", JSON.stringify(parsed, null, 2));
      }

      setGenerated(adText);
    } catch (err) {
      console.error("Unexpected error calling RPC:", err);
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
          {loading ? "عم يجهزلك الإعلان..." : "Generate Facebook Ad"}
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
