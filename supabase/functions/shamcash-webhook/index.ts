import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const payload = await req.json();
    const event = payload.event as string;
    const invoiceNumber = payload.invoiceNumber as string;

    if (!invoiceNumber) {
      return json({ error: "invoiceNumber missing" }, 400);
    }

    const { data: order } = await admin
      .from("orders")
      .select("id, status, payment_status")
      .eq("shamcash_invoice", invoiceNumber)
      .maybeSingle();

    if (!order) {
      // Acknowledge so Sham Cash does not retry forever
      console.warn("Webhook: no order for invoice", invoiceNumber);
      return json({ ok: true, ignored: true });
    }

    if (event === "invoice.paid") {
      if (order.payment_status !== "paid") {
        await admin
          .from("orders")
          .update({
            payment_status: "paid",
            shamcash_tran_id:
              (payload.transactionRef as string) || order.id,
            paid_at: (payload.paidAt as string) || new Date().toISOString(),
            status: order.status === "pending" ? "confirmed" : order.status,
          })
          .eq("id", order.id);
      }
      return json({ ok: true, event: "invoice.paid" });
    }

    if (event === "invoice.expired") {
      if (order.payment_status === "awaiting_payment") {
        await admin
          .from("orders")
          .update({ payment_status: "expired" })
          .eq("id", order.id);
      }
      return json({ ok: true, event: "invoice.expired" });
    }

    return json({ ok: true, ignored: true, event });
  } catch (e) {
    console.error("shamcash-webhook error", e);
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
