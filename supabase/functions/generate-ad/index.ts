import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت مسوّق سوري محترف على السوشال ميديا. مطلوب منك تكتب إعلان فريد وجذاب لفيسبوك وإنستغرام.

قواعد صارمة:
- استخدم لهجة سورية طبيعية (شامية أو حلبية حسب السياق)
- لا تستخدم أبداً عبارة "يا أكابر أحلى العروض عنا" أو أي قالب جاهز مكرر
- كل إعلان لازم يكون مختلف تماماً
- استخدم إيموجي بشكل ذكي
- اكتب بأسلوب يخلّي الزبون يحس إنو لازم يطلب هلق
- خلّي الإعلان جاهز للنشر مباشرة مع فواصل أسطر واضحة
- أضف دعوة لاتخاذ إجراء (اطلب عالواتساب أو راسلنا)
- اكتب الإعلان مباشرة بدون أي مقدمة أو شرح`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productDescription, angle } = await req.json();

    if (!productDescription || typeof productDescription !== "string" || productDescription.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Product description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userPrompt = `الزاوية التسويقية لهالإعلان: ${angle || "ركّز على الجودة"}

معلومات المنتج:
${productDescription.trim()}

رقم عشوائي للتنويع: ${Date.now()}

اكتب الإعلان مباشرة:`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 1.2,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "ai_error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const ad = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ ad }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-ad error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
