import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Action = "connect" | "verify" | "remove";

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

function isApex(domain: string) {
  return domain.split(".").length === 2;
}

function vercelHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function teamQuery(teamId: string | undefined) {
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "غير مصرح" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "جلسة غير صالحة" }, 401);

    const body = await req.json();
    const action = body.action as Action;
    const domainRaw = typeof body.domain === "string" ? body.domain : "";

    const vercelToken = Deno.env.get("VERCEL_TOKEN");
    const projectId = Deno.env.get("VERCEL_PROJECT_ID");
    const teamId = Deno.env.get("VERCEL_TEAM_ID") || undefined;

    if (!vercelToken || !projectId) {
      return json({
        error:
          "إعدادات Vercel ناقصة. أضف VERCEL_TOKEN و VERCEL_PROJECT_ID في أسرار Supabase Edge Functions.",
      }, 500);
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, custom_domain, domain_status, plan_type")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) return json({ error: "الملف غير موجود" }, 404);

    // Optional: restrict custom domains to paid plans
    // if (profile.plan_type !== "pro" && profile.plan_type !== "enterprise") {
    //   return json({ error: "النطاق المخصص متاح للباقة Pro فقط" }, 403);
    // }

    if (action === "connect") {
      const domain = normalizeDomain(domainRaw);
      if (!DOMAIN_RE.test(domain)) {
        return json({ error: "صيغة النطاق غير صحيحة" }, 400);
      }

      const { data: taken } = await admin
        .from("profiles")
        .select("id")
        .eq("custom_domain", domain)
        .neq("id", user.id)
        .maybeSingle();

      if (taken) return json({ error: "هذا النطاق مستخدم من متجر آخر" }, 409);

      // Remove previous domain from Vercel if changing
      if (profile.custom_domain && profile.custom_domain !== domain) {
        await fetch(
          `https://api.vercel.com/v9/projects/${projectId}/domains/${encodeURIComponent(profile.custom_domain)}${teamQuery(teamId)}`,
          { method: "DELETE", headers: vercelHeaders(vercelToken) },
        );
      }

      const addRes = await fetch(
        `https://api.vercel.com/v10/projects/${projectId}/domains${teamQuery(teamId)}`,
        {
          method: "POST",
          headers: vercelHeaders(vercelToken),
          body: JSON.stringify({ name: domain }),
        },
      );

      const addData = await addRes.json();
      // 409 = already on project — OK to continue
      if (!addRes.ok && addRes.status !== 409) {
        return json({
          error: addData?.error?.message || "فشل إضافة النطاق في Vercel",
          details: addData,
        }, 400);
      }

      await admin
        .from("profiles")
        .update({
          custom_domain: domain,
          domain_status: "pending",
          domain_verified_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      const dns = isApex(domain)
        ? {
            type: "A",
            name: "@",
            value: "76.76.21.21",
            note: "للنطاق الجذري (example.com)",
          }
        : {
            type: "CNAME",
            name: domain.split(".")[0],
            value: "cname.vercel-dns.com",
            note: "للنطاق الفرعي (shop.example.com)",
          };

      return json({
        ok: true,
        domain,
        status: "pending",
        dns,
        verification: addData?.verification || null,
        message: "أضف سجل DNS ثم اضغط التحقق",
      });
    }

    if (action === "verify") {
      const domain = normalizeDomain(domainRaw || profile.custom_domain || "");
      if (!domain) return json({ error: "لا يوجد نطاق للتحقق منه" }, 400);

      await admin
        .from("profiles")
        .update({ domain_status: "verifying", updated_at: new Date().toISOString() })
        .eq("id", user.id);

      const configRes = await fetch(
        `https://api.vercel.com/v6/domains/${encodeURIComponent(domain)}/config${teamQuery(teamId)}`,
        { headers: vercelHeaders(vercelToken) },
      );
      const config = await configRes.json();

      const projectDomainRes = await fetch(
        `https://api.vercel.com/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}${teamQuery(teamId)}`,
        { headers: vercelHeaders(vercelToken) },
      );
      const projectDomain = await projectDomainRes.json();

      const misconfigured = config?.misconfigured === true;
      const verified = projectDomain?.verified === true;
      const active = verified && !misconfigured;

      if (active) {
        await admin
          .from("profiles")
          .update({
            custom_domain: domain,
            domain_status: "active",
            domain_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        return json({
          ok: true,
          domain,
          status: "active",
          message: "النطاق مفعّل بنجاح",
        });
      }

      await admin
        .from("profiles")
        .update({
          domain_status: misconfigured ? "error" : "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      const dns = isApex(domain)
        ? { type: "A", name: "@", value: "76.76.21.21" }
        : { type: "CNAME", name: domain.split(".")[0], value: "cname.vercel-dns.com" };

      return json({
        ok: false,
        domain,
        status: misconfigured ? "error" : "pending",
        dns,
        verification: projectDomain?.verification || null,
        message: misconfigured
          ? "DNS غير مضبوط بشكل صحيح بعد. انتظر انتشار السجلات ثم أعد المحاولة."
          : "لم يكتمل التحقق بعد. تأكد من سجلات DNS وانتظر بضع دقائق.",
        config,
      });
    }

    if (action === "remove") {
      const domain = profile.custom_domain;
      if (domain) {
        await fetch(
          `https://api.vercel.com/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}${teamQuery(teamId)}`,
          { method: "DELETE", headers: vercelHeaders(vercelToken) },
        );
      }

      await admin
        .from("profiles")
        .update({
          custom_domain: null,
          domain_status: null,
          domain_verified_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      return json({ ok: true, message: "تم إزالة النطاق" });
    }

    return json({ error: "إجراء غير معروف" }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : "خطأ غير متوقع";
    return json({ error: message }, 500);
  }
});
