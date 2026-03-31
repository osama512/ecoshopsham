import { useState, useRef } from "react";
import { Sparkles, Facebook, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AIMarketerPage = () => {
  const [input, setInput] = useState("");
  const [generated, setGenerated] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setGenerated("");

    try {
      abortRef.current = new AbortController();

      const resp = await fetch(
        `${(supabase as any).supabaseUrl}/functions/v1/generate-ad`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(supabase as any).supabaseKey}`,
          },
          body: JSON.stringify({ productDescription: input.trim() }),
          signal: abortRef.current.signal,
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed to generate ad" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              setGenerated(fullText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              setGenerated(fullText);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast({
          title: "Generation Failed",
          description: err.message || "Could not generate the ad. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
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
          placeholder="e.g. Aleppo Soap — traditional handmade olive oil soap from Syria..."
          rows={4}
          className="resize-none"
          disabled={loading}
        />
        <Button
          onClick={handleGenerate}
          disabled={!input.trim() || loading}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-semibold"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Facebook className="h-4 w-4" />
          )}
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
              disabled={loading}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <p className="text-sm whitespace-pre-line leading-relaxed" dir="auto">
            {generated}
            {loading && <span className="inline-block w-1.5 h-4 bg-secondary/60 animate-pulse ml-0.5 align-text-bottom" />}
          </p>
        </Card>
      )}
    </div>
  );
};

export default AIMarketerPage;
