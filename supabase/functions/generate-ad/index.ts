import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a high-end Syrian marketing expert. Write a Comprehensive, Long-form (200+ words) advertisement. Structure it into 4 detailed sections:

1. The Hook: An emotional/engaging opening in Syrian dialect.
2. The Story: A deep dive into the product's value and how it solves the customer's problem (2 long paragraphs).
3. Detailed Specs: Use bullet points to elaborate on EVERY detail provided in the input.
4. The Closing: A strong call to action with price and delivery info.

قواعد صارمة:
- اكتب بلهجة سورية طبيعية (شامية أو حلبية حسب السياق)
- Be verbose, descriptive, and use rich Syrian vocabulary. Avoid short/lazy summaries.
- استخدم إيموجي بشكل ذكي ومتنوع
- لا تكتب عناوين الأقسام (لا تكتب "Hook:" أو "القصة:") — ادمجهم بشكل طبيعي
- اكتب الإعلان جاهز للنشر مباشرة على فيسبوك أو إنستغرام
- إذا ما كان السعر مذكور، اكتب "تواصل معنا لمعرفة السعر 📩"
- لا تستخدم عبارة "يا أكابر أحلى العروض عنا" أبداً`;

async function callAI(prompt: string, apiKey: string, signal: AbortSignal) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 1.0,
      max_tokens: 1024,
    }),
  });
  return response;
}

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

    const userPrompt = `الزاوية التسويقية: ${angle || "ركّز على الجودة والقيمة"}

معلومات المنتج:
${productDescription.trim()}

تعليمات:
- استخدم كل التفاصيل المذكورة أعلاه
- إذا ما كان في سعر مذكور، اكتب "تواصل معنا لمعرفة السعر 📩"
- اكتب إعلان طويل ومفصّل (200 كلمة على الأقل)
- رقم عشوائي للتنويع: ${Date.now()}

اكتب الإعلان مباشرة:`;

    // Attempt 1: 2-second timeout
    let ad = "";
    let success = false;

    for (let attempt = 0; attempt < 2 && !success; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), attempt === 0 ? 12000 : 15000);

        const response = await callAI(userPrompt, LOVABLE_API_KEY, controller.signal);
        clearTimeout(timeout);

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

        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content || "";
          if (text.trim().length > 30) {
            ad = text.trim();
            success = true;
          }
        }
      } catch (e) {
        console.error(`Attempt ${attempt + 1} failed:`, e);
      }
    }

    if (success) {
      return new Response(JSON.stringify({ ad }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // API completely unreachable — signal fallback
    return new Response(JSON.stringify({ ad: "", fallback: true }), {
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
