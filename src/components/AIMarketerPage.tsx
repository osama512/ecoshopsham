import { useState } from "react";
import { Sparkles, Facebook, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

const sampleAd = `🧼✨ Discover the Magic of Authentic Aleppo Soap!

Made with pure olive oil using centuries-old traditions from the heart of Syria 🇸🇾

🌿 100% Natural ingredients
💧 Perfect for sensitive skin
🎁 Great gift for loved ones

Order now and get FREE delivery on your first purchase!

📩 DM us to order
📱 WhatsApp: +963 xxx xxx xxx

#AleppoSoap #NaturalSkincare #SyrianProducts #HandmadeSoap #SyriaBiz`;

const AIMarketerPage = () => {
  const [input, setInput] = useState("");
  const [generated, setGenerated] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      setGenerated(sampleAd);
      setLoading(false);
    }, 1500);
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
        <p className="text-sm text-muted-foreground">Generate ads for your products instantly</p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-secondary">
          <Sparkles className="h-5 w-5" />
          <span className="font-semibold text-sm">What product do you want to market?</span>
        </div>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Aleppo Soap — traditional handmade olive oil soap..."
          rows={4}
          className="resize-none"
        />
        <Button
          onClick={handleGenerate}
          disabled={!input.trim() || loading}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-semibold"
        >
          <Facebook className="h-4 w-4" />
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5 text-xs h-8"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <p className="text-sm whitespace-pre-line leading-relaxed">{generated}</p>
        </Card>
      )}
    </div>
  );
};

export default AIMarketerPage;
