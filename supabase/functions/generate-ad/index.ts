import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت مسوّق سوري محترف ومبدع على السوشال ميديا، متخصص بكتابة إعلانات طويلة ومفصّلة وجذابة لفيسبوك وإنستغرام.

قواعد صارمة:
- اكتب إعلان طويل ومفصّل (200 كلمة على الأقل) — لا تختصر أبداً
- لا تلخّص — اسرد قصة جذابة أو اكتب عرض احترافي مفصّل للمنتج
- استخدم كل التفاصيل اللي بيعطيك ياها المستخدم (المواد، الحركة، المنشأ، الميزات...)
- استخدم لهجة سورية طبيعية (شامية أو حلبية حسب السياق)
- لا تستخدم أبداً عبارة "يا أكابر أحلى العروض عنا" أو أي قالب جاهز مكرر
- استخدم إيموجي بشكل ذكي ومتنوع
- اكتب الإعلان جاهز للنشر مباشرة

البنية المطلوبة للإعلان (التزم فيها دائماً):

1. 🔥 Hook (افتتاحية جذابة): جملة سورية قوية تلفت الانتباه فوراً
2. 📝 Body (الجسم): فقرة أو فقرتين تحكي قصة المنتج، فوائده، وليش الزبون لازم يقتنيه. استخدم وصف عاطفي وتفاصيل حسية
3. 📋 Specs (المواصفات): نقاط واضحة (bullet points) للمواصفات التقنية والتفاصيل المهمة
4. 💰 Price & Offer (السعر والعرض): اذكر السعر بوضوح مع معلومات الشحن. إذا ما كان السعر مذكور بالمعلومات، اكتب "تواصل معنا لمعرفة السعر 📩"
5. 📲 CTA (دعوة لاتخاذ إجراء): خاتمة قوية تدفع الزبون للطلب فوراً عبر واتساب

ملاحظة مهمة: اكتب الإعلان مباشرة بدون أي مقدمة أو شرح أو عناوين أقسام (لا تكتب "Hook:" أو "Body:" — ادمجهم بشكل طبيعي)`;

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

معلومات المنتج المطلوب الإعلان عنه:
${productDescription.trim()}

تعليمات إضافية:
- استخدم كل التفاصيل المذكورة أعلاه بالإعلان
- إذا ما كان في سعر مذكور، اكتب "تواصل معنا لمعرفة السعر 📩"
- اكتب إعلان طويل ومفصّل (200 كلمة على الأقل)
- رقم عشوائي للتنويع: ${Date.now()}

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
        temperature: 1.1,
        max_tokens: 1500,
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
