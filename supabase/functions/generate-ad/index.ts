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

const jsonResponse = (payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });

async function parseApiError(response: Response) {
  const raw = await response.text();

  if (!raw.trim()) {
    return `API error: ${response.status}`;
  }

  try {
    const parsed = JSON.parse(raw);
    const message = parsed?.error?.message ?? parsed?.error ?? parsed?.message ?? parsed?.detail ?? raw;
    return typeof message === "string" && message.trim() ? message : raw;
  } catch {
    return raw;
  }
}

async function callAI(prompt: string, apiKey: string, signal: AbortSignal) {
  return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productDescription, angle } = await req.json();

    if (!productDescription || typeof productDescription !== "string" || productDescription.trim().length === 0) {
      return jsonResponse({ error: "Product description is required" });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return jsonResponse({ error: "API Key Missing" });
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

    let lastError = "Network Error";

    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      try {
        const response = await callAI(userPrompt, LOVABLE_API_KEY, controller.signal);
        clearTimeout(timeout);

        if (response.status === 429) {
          return jsonResponse({ error: "Rate Limit Exceeded" });
        }

        if (response.status === 402) {
          return jsonResponse({ error: "Payment Required" });
        }

        if (!response.ok) {
          const apiError = await parseApiError(response);
          console.error("generate-ad upstream error:", response.status, apiError);
          return jsonResponse({ error: apiError || `API error: ${response.status}` });
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;

        if (typeof text === "string" && text.trim()) {
          return jsonResponse({ ad: text.trim() });
        }

        lastError = "Empty AI response";
      } catch (e) {
        clearTimeout(timeout);
        if (e instanceof Error) {
          lastError = e.name === "AbortError" ? "Network Error" : e.message || "Network Error";
        } else {
          lastError = "Network Error";
        }
        console.error(`generate-ad attempt ${attempt + 1} failed:`, e);
      }
    }

    return jsonResponse({ error: lastError });
  } catch (e) {
    console.error("generate-ad error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});