import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHAMCASH_BASE = "https://api-shamcash.com/api";

type Action = "create-invoice" | "verify-payment" | "get-invoice";

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function shamcashHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "X-Api-Key": apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function shamcashFetch(
  path: string,
  apiKey: string,
  options: { method?: string; body?: unknown } = {},
) {
  const res = await fetch(`${SHAMCASH_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: shamcashHeaders(apiKey),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  return { ok: res.ok, status: res.status, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const action = body.action as Action;

    if (action === "create-invoice") {
      const orderId = typeof body.orderId === "string" ? body.orderId : "";
      const merchantId = typeof body.merchantId === "string" ? body.merchantId : "";
      if (!orderId || !merchantId) {
        return json({ error: "orderId و merchantId مطلوبان" }, 400);
      }

      const { data: order, error: orderErr } = await admin
        .from("orders")
        .select("id, merchant_id, total_price, payment_status, shamcash_invoice")
        .eq("id", orderId)
        .eq("merchant_id", merchantId)
        .maybeSingle();

      if (orderErr || !order) {
        return json({ error: "الطلب غير موجود" }, 404);
      }

      if (order.payment_status === "paid") {
        return json({
          invoiceNumber: order.shamcash_invoice,
          paymentStatus: "paid",
          message: "الطلب مدفوع مسبقاً",
        });
      }

      // Reuse existing pending invoice if present (unless expired — create a new one)
      if (
        order.shamcash_invoice &&
        order.payment_status === "awaiting_payment"
      ) {
        return json({
          invoiceNumber: order.shamcash_invoice,
          paymentStatus: "awaiting_payment",
        });
      }

      if (order.payment_status === "expired") {
        // Clear expired invoice so a fresh one can be issued
        await admin
          .from("orders")
          .update({ shamcash_invoice: null, payment_status: "awaiting_payment" })
          .eq("id", orderId);
      }

      const { data: sc, error: scErr } = await admin
        .from("merchant_shamcash")
        .select("wallet_address, api_key, enabled")
        .eq("merchant_id", merchantId)
        .maybeSingle();

      if (scErr || !sc || !sc.enabled) {
        return json({ error: "شام كاش غير مفعّل لهذا المتجر" }, 400);
      }
      if (!sc.api_key || !sc.wallet_address) {
        return json({ error: "إعدادات شام كاش ناقصة لدى التاجر" }, 400);
      }

      const webhookUrl = `${supabaseUrl}/functions/v1/shamcash-webhook`;
      const amount = Number(order.total_price);

      const { ok, status, data } = await shamcashFetch("/v1/invoices", sc.api_key, {
        method: "POST",
        body: {
          amount,
          currency: "SYP",
          walletAddress: sc.wallet_address,
          webhookUrl,
          expiresInMinutes: 60,
          metadata: {
            orderId,
            merchantId,
            source: "ecoshopsham",
          },
        },
      });

      if (!ok) {
        console.error("ShamCash create invoice failed", status, data);
        return json(
          {
            error: (data.message as string) || (data.error as string) || "فشل إنشاء فاتورة شام كاش",
            code: data.error,
          },
          status >= 400 && status < 600 ? status : 502,
        );
      }

      const nested = (data.data as Record<string, unknown>) || {};
      const invoiceNumber =
        (data.invoiceNumber as string) ||
        (data.invoiceId as string) ||
        (data.id as string) ||
        (nested.invoiceNumber as string) ||
        (nested.invoiceId as string);

      if (!invoiceNumber) {
        console.error("ShamCash invoice response missing number", data);
        return json({ error: "لم يُرجع شام كاش رقم فاتورة", raw: data }, 502);
      }

      const paymentUrl =
        (data.paymentUrl as string) ||
        (data.checkoutUrl as string) ||
        (data.url as string) ||
        (nested.paymentUrl as string) ||
        (nested.checkoutUrl as string) ||
        null;

      await admin
        .from("orders")
        .update({
          payment_status: "awaiting_payment",
          shamcash_invoice: invoiceNumber,
        })
        .eq("id", orderId);

      return json({
        invoiceNumber,
        paymentStatus: "awaiting_payment",
        amount,
        currency: "SYP",
        expiresInMinutes: 60,
        ...(paymentUrl ? { paymentUrl } : {}),
      });
    }

    if (action === "verify-payment") {
      const orderId = typeof body.orderId === "string" ? body.orderId : "";
      const invoiceNumber =
        typeof body.invoiceNumber === "string" ? body.invoiceNumber.trim() : "";
      const tranId = typeof body.tran_id === "string" ? body.tran_id.trim() : "";

      if (!orderId || !invoiceNumber || !tranId) {
        return json({ error: "orderId و invoiceNumber و tran_id مطلوبة" }, 400);
      }

      const { data: order, error: orderErr } = await admin
        .from("orders")
        .select("id, merchant_id, payment_status, shamcash_invoice, status")
        .eq("id", orderId)
        .maybeSingle();

      if (orderErr || !order) {
        return json({ error: "الطلب غير موجود" }, 404);
      }

      if (order.payment_status === "paid") {
        return json({ paymentStatus: "paid", message: "تم الدفع مسبقاً" });
      }

      if (order.shamcash_invoice && order.shamcash_invoice !== invoiceNumber) {
        return json({ error: "رقم الفاتورة لا يطابق الطلب" }, 400);
      }

      const { data: sc } = await admin
        .from("merchant_shamcash")
        .select("api_key, enabled")
        .eq("merchant_id", order.merchant_id)
        .maybeSingle();

      if (!sc?.api_key) {
        return json({ error: "إعدادات شام كاش غير موجودة" }, 400);
      }

      const { ok, status, data } = await shamcashFetch(
        `/v1/invoices/${encodeURIComponent(invoiceNumber)}/verify`,
        sc.api_key,
        { method: "POST", body: { tran_id: tranId } },
      );

      if (!ok) {
        const code = (data.error as string) || "";
        const messages: Record<string, string> = {
          MISSING_TRAN_ID: "أدخل رقم العملية",
          TRANSACTION_NOT_FOUND:
            "رقم العملية غير موجود بعد — انتظر دقيقة وأعد المحاولة",
          ALREADY_PAID: "الفاتورة مدفوعة بالفعل",
          TRAN_ID_USED: "رقم العملية مستخدم مع فاتورة أخرى",
          EXPIRED: "انتهت صلاحية الفاتورة",
          AMOUNT_MISMATCH: "المبلغ المحوّل لا يطابق قيمة الفاتورة",
        };
        return json(
          {
            error: messages[code] || (data.message as string) || "فشل التحقق من الدفع",
            code,
          },
          status >= 400 && status < 600 ? status : 502,
        );
      }

      await admin
        .from("orders")
        .update({
          payment_status: "paid",
          shamcash_tran_id: tranId,
          paid_at: new Date().toISOString(),
          status: order.status === "pending" ? "confirmed" : order.status,
        })
        .eq("id", orderId);

      return json({ paymentStatus: "paid", message: "تم تأكيد الدفع بنجاح" });
    }

    if (action === "get-invoice") {
      const orderId = typeof body.orderId === "string" ? body.orderId : "";
      if (!orderId) return json({ error: "orderId مطلوب" }, 400);

      const { data: order } = await admin
        .from("orders")
        .select("id, payment_status, shamcash_invoice, total_price, paid_at")
        .eq("id", orderId)
        .maybeSingle();

      if (!order) return json({ error: "الطلب غير موجود" }, 404);

      return json({
        orderId: order.id,
        paymentStatus: order.payment_status,
        invoiceNumber: order.shamcash_invoice,
        amount: order.total_price,
        paidAt: order.paid_at,
      });
    }

    return json({ error: "إجراء غير معروف" }, 400);
  } catch (e) {
    console.error("shamcash-payment error", e);
    return json({ error: e instanceof Error ? e.message : "خطأ غير متوقع" }, 500);
  }
});
