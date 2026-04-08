import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a professional Syrian copywriter. Write a punchy and precise social media ad. Target length: strictly around 100 words.

Follow this exact format:
- Hook: One catchy Syrian sentence.
- Body: 2 short sentences describing the core value.
- Specs: Maximum 3 short bullet points (only use the input provided).
- Closing: Price and a fast Call to Action.

قواعد:
- اكتب بلهجة سورية طبيعية
- استخدم إيموجي بشكل ذكي
- لا تكتب عناوين الأقسام — ادمجهم بشكل طبيعي
- لا تكتب فقرات طويلة أبداً
- إذا ما كان السعر مذكور، اكتب "تواصل معنا لمعرفة السعر 📩"
- الإعلان جاهز للنشر على فيسبوك أو إنستغرام`;

const jsonResponse = (payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });

async function parseApiError(response: Response) {
  const raw = await response.text();
  if (!raw.trim()) return `API error: ${response.status}`;
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
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 400,
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

اكتب إعلان قصير ومباشر (100 كلمة تقريباً):`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await callAI(userPrompt, LOVABLE_API_KEY, controller.signal);
      clearTimeout(timeout);

      if (response.status === 429) return jsonResponse({ error: "Rate Limit Exceeded" });
      if (response.status === 402) return jsonResponse({ error: "Payment Required" });

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

      return jsonResponse({ error: "Empty AI response" });
    } catch (e) {
      clearTimeout(timeout);
      const msg = e instanceof Error
        ? (e.name === "AbortError" ? "Network Error" : e.message || "Network Error")
        : "Network Error";
      console.error("generate-ad failed:", e);
      return jsonResponse({ error: msg });
    }
  } catch (e) {
    console.error("generate-ad error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});
