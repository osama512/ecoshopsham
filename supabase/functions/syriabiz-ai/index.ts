import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a professional Syrian marketing expert. Write a Facebook ad in the local Syrian dialect. Use catchy local slang like (يا أكابر، عروض نار، خامة بتجنن، سعر لقطة). Avoid formal Arabic. Use emojis and include a call to action to order via WhatsApp.`;

const FALLBACK_AD = "يا أكابر، أحلى العروض عنا وبأسعار لقطة ما بتتعوض! جودة نخب أول وشغل بيرفع الراس. للطلب والاستفسار تواصلوا معنا عالواتساب وأبشروا بالخير! 🔥🇸🇾";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productDescription } = await req.json();

    if (!productDescription?.trim()) {
      return new Response(
        JSON.stringify({ ad: FALLBACK_AD }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not set");
      return new Response(
        JSON.stringify({ ad: FALLBACK_AD }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${SYSTEM_PROMPT}\n\nWrite a Facebook ad for this product:\n\n${productDescription.trim()}` },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini error:", response.status, await response.text());
      return new Response(
        JSON.stringify({ ad: FALLBACK_AD }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || FALLBACK_AD;

    return new Response(
      JSON.stringify({ ad: text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("syriabiz-ai error:", e);
    return new Response(
      JSON.stringify({ ad: FALLBACK_AD }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
