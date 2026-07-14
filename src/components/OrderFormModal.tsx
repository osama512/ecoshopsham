import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MessageCircle, Tag, CheckCircle2, Info, Wallet, Copy, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/integrations/supabase/db-types";
import { formatSyrianWhatsApp, isValidPhone } from "@/lib/phone";
import { useToast } from "@/hooks/use-toast";

interface ShippingZone {
  id: string;
  name: string;
  price: number;
}

interface PaymentMethodEntry {
  id: string;
  name: string;
  details?: string;
  enabled: boolean;
}

const ALL_PAYMENT_LABELS: Record<string, string> = {
  shamcash: "شام كاش",
  cash: "الدفع عند الاستلام",
  syriatel_cash: "سيريتل كاش / MTN كاش",
  haram_transfer: "تحويل الهرم / الفؤاد",
};

const SYRIAN_CITIES = [
  "دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس", "دير الزور",
  "الرقة", "الحسكة", "درعا", "السويداء", "القنيطرة", "إدلب", "ريف دمشق",
];

interface OrderFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  merchantId: string;
  whatsapp: string;
}

type Step = "form" | "shamcash_pay" | "paid";

const OrderFormModal = ({ open, onOpenChange, product, merchantId, whatsapp }: OrderFormModalProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("form");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [selectedShippingId, setSelectedShippingId] = useState("");
  const [saving, setSaving] = useState(false);

  const [activePayments, setActivePayments] = useState<{ value: string; label: string; details?: string }[]>([]);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [promoCode, setPromoCode] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_type: string; discount_value: number } | null>(null);
  const [promoError, setPromoError] = useState("");

  // Sham Cash payment step
  const [orderId, setOrderId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [tranId, setTranId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");
  const paidToastShown = useRef(false);

  useEffect(() => {
    if (!open) {
      setSettingsLoaded(false);
      return;
    }
    if (settingsLoaded) return;

    const fetchSettings = async () => {
      const { data } = await supabase
        .from("store_settings" as any)
        .select("*")
        .eq("merchant_id", merchantId)
        .maybeSingle();

      if (data) {
        const d = data as any;
        const pm = d.payment_methods;
        if (Array.isArray(pm)) {
          const active = (pm as PaymentMethodEntry[])
            .filter((p) => p.enabled)
            .map((p) => ({
              value: p.id,
              label: p.name || ALL_PAYMENT_LABELS[p.id] || p.id,
              details: p.details,
            }));
          if (active.length > 0) {
            setActivePayments(active);
            setPaymentMethod(active[0].value);
          }
        } else if (pm && typeof pm === "object") {
          const active = Object.entries(pm as Record<string, boolean>)
            .filter(([, enabled]) => enabled)
            .map(([key]) => ({ value: key, label: ALL_PAYMENT_LABELS[key] || key }));
          if (active.length > 0) {
            setActivePayments(active);
            setPaymentMethod(active[0].value);
          }
        }
        if (d.shipping_zones && Array.isArray(d.shipping_zones) && d.shipping_zones.length > 0) {
          setShippingZones(d.shipping_zones);
        }
      }

      const { data: profile } = await supabase
        .from("profiles" as any)
        .select("payment_instructions")
        .eq("id", merchantId)
        .single();

      if (profile && (profile as any).payment_instructions) {
        setPaymentInstructions((profile as any).payment_instructions);
      }

      setSettingsLoaded(true);
    };
    fetchSettings();
  }, [open, merchantId, settingsLoaded]);

  const payments = activePayments.length > 0
    ? activePayments
    : Object.entries(ALL_PAYMENT_LABELS)
        .filter(([k]) => k !== "shamcash")
        .map(([value, label]) => ({ value, label }));

  useEffect(() => {
    if (!paymentMethod && payments.length > 0) {
      setPaymentMethod(payments[0].value);
    }
  }, [payments, paymentMethod]);

  const selectedShipping = shippingZones.find((z) => z.id === selectedShippingId);
  const shippingCost = selectedShipping?.price ?? 0;
  const productSubtotal = Number(product.price);
  const discountAmount = appliedCoupon
    ? appliedCoupon.discount_type === "fixed"
      ? Math.min(appliedCoupon.discount_value, productSubtotal)
      : Math.round((productSubtotal * appliedCoupon.discount_value) / 100)
    : 0;
  const totalPrice = Math.max(0, productSubtotal - discountAmount) + shippingCost;

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoChecking(true);
    setPromoError("");
    setAppliedCoupon(null);

    const { data, error } = await (supabase.from("coupons") as any)
      .select("code, discount_type, discount_value")
      .eq("merchant_id", merchantId)
      .eq("code", promoCode.trim().toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    setPromoChecking(false);
    if (error || !data) {
      setPromoError("رمز الخصم غير صالح أو غير نشط");
      return;
    }
    setAppliedCoupon({
      code: data.code,
      discount_type: data.discount_type,
      discount_value: Number(data.discount_value),
    });
  };

  const phoneValid = isValidPhone(phone);

  const buildWhatsAppMessage = (extra?: string) => {
    const paymentLabel = payments.find((p) => p.value === paymentMethod)?.label ?? paymentMethod;
    let message =
      `🛒 طلب جديد من ecoshopsham\n\n` +
      `📦 المنتج: ${product.name}\n` +
      `💰 المجموع: ${productSubtotal.toLocaleString()} ل.س\n`;

    if (appliedCoupon) {
      const discLabel =
        appliedCoupon.discount_type === "fixed"
          ? `${appliedCoupon.discount_value.toLocaleString()} ل.س`
          : `${appliedCoupon.discount_value}%`;
      message += `🏷️ كود الخصم: ${appliedCoupon.code}\n`;
      message += `💸 الخصم: ${discLabel} = -${discountAmount.toLocaleString()} ل.س\n`;
    }

    if (selectedShipping) {
      message += `🚚 أجرة التوصيل: ${selectedShipping.name} — ${shippingCost.toLocaleString()} ل.س\n`;
    }

    message += `💵 الإجمالي النهائي: ${totalPrice.toLocaleString()} ل.س\n`;
    message +=
      `👤 الاسم: ${fullName.trim()}\n` +
      `📱 الهاتف: ${phone.trim()}\n` +
      `🏙️ المدينة: ${city}\n` +
      `📍 العنوان: ${address.trim()}\n` +
      `💳 الدفع: ${paymentLabel}`;

    if (extra) message += `\n${extra}`;
    return message;
  };

  const openWhatsApp = (extra?: string) => {
    const num = formatSyrianWhatsApp(whatsapp);
    const encoded = encodeURIComponent(buildWhatsAppMessage(extra));
    window.open(`https://wa.me/${num}?text=${encoded}`, "_blank", "noopener,noreferrer");
  };

  const resetForm = () => {
    setFullName("");
    setCity("");
    setAddress("");
    setPhone("");
    setPaymentMethod("");
    setSelectedShippingId("");
    setPromoCode("");
    setAppliedCoupon(null);
    setPromoError("");
    setOrderId(null);
    setInvoiceNumber("");
    setTranId("");
    setInvoiceError("");
    setCheckingPayment(false);
    setPaymentUrl("");
    paidToastShown.current = false;
    setStep("form");
  };

  const createShamCashInvoice = async (newOrderId: string) => {
    setCreatingInvoice(true);
    setInvoiceError("");
    setPaymentUrl("");
    setStep("shamcash_pay");

    const { data, error } = await supabase.functions.invoke("shamcash-payment", {
      body: { action: "create-invoice", orderId: newOrderId, merchantId },
    });
    setCreatingInvoice(false);

    if (error || data?.error) {
      const msg = data?.error || error?.message || "حاول مرة أخرى";
      setInvoiceError(msg);
      toast({
        title: "تعذّر إنشاء فاتورة شام كاش",
        description: msg,
        variant: "destructive",
      });
      return false;
    }

    if (data.paymentStatus === "paid") {
      setInvoiceNumber(data.invoiceNumber || "");
      setStep("paid");
      if (!paidToastShown.current) {
        paidToastShown.current = true;
        toast({ title: "تم تأكيد الدفع بنجاح ✅" });
      }
      return true;
    }

    setInvoiceNumber(data.invoiceNumber);
    if (typeof data.paymentUrl === "string" && data.paymentUrl) {
      // Optional deep-link / checkout URL from Sham Cash API
      setPaymentUrl(data.paymentUrl);
    }
    return true;
  };

  const pollPaymentStatus = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("shamcash-payment", {
      body: { action: "get-invoice", orderId: id },
    });
    if (error || data?.error) return null;
    return data as {
      paymentStatus?: string;
      invoiceNumber?: string;
    };
  };

  // Auto-detect payment via webhook without requiring tran_id
  useEffect(() => {
    if (step !== "shamcash_pay" || !orderId || !invoiceNumber || creatingInvoice) return;

    let cancelled = false;
    const tick = async () => {
      setCheckingPayment(true);
      const status = await pollPaymentStatus(orderId);
      if (cancelled) return;
      setCheckingPayment(false);

      if (status?.paymentStatus === "paid") {
        setStep("paid");
        if (!paidToastShown.current) {
          paidToastShown.current = true;
          toast({ title: "تم تأكيد الدفع بنجاح ✅" });
        }
        return;
      }
      if (status?.paymentStatus === "expired") {
        setInvoiceError("انتهت صلاحية فاتورة شام كاش. يمكنك إنشاء فاتورة جديدة.");
      }
    };

    tick();
    const interval = window.setInterval(tick, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [step, orderId, invoiceNumber, creatingInvoice, toast]);

  const copyInvoice = async () => {
    if (!invoiceNumber) return;
    try {
      await navigator.clipboard.writeText(invoiceNumber);
      toast({ title: "تم نسخ رقم الفاتورة" });
    } catch {
      toast({ title: "تعذّر النسخ", variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!fullName.trim() || !city || !address.trim() || !phone.trim() || !phoneValid) return;

    setSaving(true);

    const orderDetails = {
      product_id: product.id,
      product_name: product.name,
      product_price: product.price,
      quantity: 1,
      city,
      address: address.trim(),
      payment_method: paymentMethod,
      customer_phone: phone.trim(),
      shipping_zone: selectedShipping?.name || null,
      shipping_cost: shippingCost,
      coupon_code: appliedCoupon?.code || null,
      discount_amount: discountAmount,
    };

    const isShamCash = paymentMethod === "shamcash";

    // Reuse order if invoice creation previously failed
    if (isShamCash && orderId) {
      setSaving(false);
      await createShamCashInvoice(orderId);
      return;
    }

    const { data: inserted, error } = await (supabase.from("orders") as any)
      .insert({
        merchant_id: merchantId,
        customer_name: fullName.trim(),
        customer_phone: phone.trim(),
        order_details: [orderDetails],
        total_price: totalPrice,
        status: "pending",
        payment_status: isShamCash ? "awaiting_payment" : "unpaid",
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !inserted?.id) {
      console.error("Order save error:", error);
      toast({
        title: "فشل حفظ الطلب",
        description: error?.message || "حاول مرة أخرى",
        variant: "destructive",
      });
      return;
    }

    setOrderId(inserted.id);

    if (isShamCash) {
      await createShamCashInvoice(inserted.id);
      return;
    }

    openWhatsApp();
    resetForm();
    onOpenChange(false);
  };

  const handleVerifyPayment = async () => {
    if (!orderId || !invoiceNumber || !tranId.trim()) return;
    setVerifying(true);

    const { data, error } = await supabase.functions.invoke("shamcash-payment", {
      body: {
        action: "verify-payment",
        orderId,
        invoiceNumber,
        tran_id: tranId.trim(),
      },
    });

    setVerifying(false);

    if (error || data?.error) {
      toast({
        title: "فشل التحقق",
        description: data?.error || error?.message || "تحقق من رقم العملية",
        variant: "destructive",
      });
      return;
    }

    setStep("paid");
    if (!paidToastShown.current) {
      paidToastShown.current = true;
      toast({ title: "تم تأكيد الدفع بنجاح ✅" });
    }
  };

  const handleCloseAfterPaid = () => {
    openWhatsApp(
      invoiceNumber
        ? `✅ دفع شام كاش مؤكد\n🧾 الفاتورة: ${invoiceNumber}${tranId ? `\n🔢 رقم العملية: ${tranId}` : ""}`
        : undefined,
    );
    resetForm();
    onOpenChange(false);
  };

  const selectedPaymentDetails = activePayments.find((p) => p.value === paymentMethod)?.details;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {step === "form" && "🛒 تأكيد الطلب"}
            {step === "shamcash_pay" && "💳 دفع عبر شام كاش"}
            {step === "paid" && "✅ تم الدفع"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <>
            <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-14 h-14 rounded-md object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-xs">📦</div>
              )}
              <div>
                <p className="font-semibold text-sm">{product.name}</p>
                <p className="font-display font-bold text-secondary text-sm">
                  {Number(product.price).toLocaleString()} ل.س
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">الاسم الكامل *</Label>
                <Input id="fullName" placeholder="أحمد محمد" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">رقم الهاتف *</Label>
                <Input
                  id="phone"
                  placeholder="09XXXXXXXX أو +1234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={16}
                />
                {phone.trim() && !phoneValid && (
                  <p className="text-xs text-destructive">أدخل رقم هاتف صحيح (مثال: 0932052427 أو +1234567890)</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>المدينة *</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المدينة" />
                  </SelectTrigger>
                  <SelectContent>
                    {SYRIAN_CITIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">العنوان التفصيلي *</Label>
                <Input
                  id="address"
                  placeholder="الحي، الشارع، البناء..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              {shippingZones.length > 0 && (
                <div className="space-y-1.5">
                  <Label>منطقة الشحن</Label>
                  <RadioGroup value={selectedShippingId} onValueChange={setSelectedShippingId} className="gap-2">
                    {shippingZones.map((zone) => (
                      <div key={zone.id} className="flex items-center gap-2 rounded-lg border p-2.5">
                        <RadioGroupItem value={zone.id} id={`ship-${zone.id}`} />
                        <Label htmlFor={`ship-${zone.id}`} className="cursor-pointer text-sm font-medium flex-1">
                          {zone.name}
                        </Label>
                        <span className="text-xs font-display font-bold text-muted-foreground">
                          {zone.price.toLocaleString()} ل.س
                        </span>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>طريقة الدفع</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="gap-2">
                  {payments.map((pm) => (
                    <div key={pm.value} className="flex items-center gap-2 rounded-lg border p-2.5">
                      <RadioGroupItem value={pm.value} id={pm.value} />
                      <Label htmlFor={pm.value} className="cursor-pointer text-sm font-medium flex-1">
                        {pm.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {paymentMethod === "shamcash" && (
                  <Alert className="border-primary/30 bg-primary/5">
                    <Wallet className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-sm">
                      بعد تأكيد الطلب تُنشأ فاتورة شام كاش مباشرة. ادفع من التطبيق — يتم التحقق تلقائياً عبر شام كاش، أو أدخل رقم العملية يدوياً.
                    </AlertDescription>
                  </Alert>
                )}

                {paymentMethod && paymentMethod !== "cash" && paymentMethod !== "shamcash" && (
                  <Alert className="border-primary/30 bg-primary/5">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-sm whitespace-pre-line">
                      {selectedPaymentDetails || paymentInstructions}
                      {(selectedPaymentDetails || paymentInstructions) && (
                        <p className="text-xs text-muted-foreground mt-2 font-medium">
                          يرجى إتمام التحويل وإرفاق صورة الإشعار في محادثة الواتساب التالية
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  رمز الخصم (اختياري)
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="أدخل رمز الخصم"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value);
                      setPromoError("");
                      setAppliedCoupon(null);
                    }}
                    className="font-mono"
                    maxLength={20}
                    disabled={!!appliedCoupon}
                  />
                  <Button
                    type="button"
                    variant={appliedCoupon ? "secondary" : "outline"}
                    size="sm"
                    onClick={applyPromo}
                    disabled={promoChecking || !!appliedCoupon || !promoCode.trim()}
                    className="shrink-0"
                  >
                    {promoChecking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : appliedCoupon ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      "تطبيق"
                    )}
                  </Button>
                </div>
                {promoError && <p className="text-xs text-destructive">{promoError}</p>}
                {appliedCoupon && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    خصم{" "}
                    {appliedCoupon.discount_type === "fixed"
                      ? `${appliedCoupon.discount_value.toLocaleString()} ل.س`
                      : `${appliedCoupon.discount_value}%`}{" "}
                    — {appliedCoupon.code}
                  </Badge>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>المجموع</span>
                  <span className="font-display font-bold">{productSubtotal.toLocaleString()} ل.س</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>الخصم ({appliedCoupon.code})</span>
                    <span className="font-display font-bold">-{discountAmount.toLocaleString()} ل.س</span>
                  </div>
                )}
                {selectedShipping && (
                  <div className="flex justify-between text-sm">
                    <span>أجرة التوصيل ({selectedShipping.name})</span>
                    <span className="font-display font-bold">{shippingCost.toLocaleString()} ل.س</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-border pt-1.5 mt-1.5">
                  <span>الإجمالي النهائي</span>
                  <span className="font-display text-secondary">{totalPrice.toLocaleString()} ل.س</span>
                </div>
              </div>

              <Button
                className="w-full bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 gap-2 font-semibold"
                onClick={handleSubmit}
                disabled={saving || creatingInvoice || !fullName.trim() || !city || !address.trim() || !phoneValid}
              >
                {saving || creatingInvoice ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : paymentMethod === "shamcash" ? (
                  <Wallet className="h-4 w-4" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
                {paymentMethod === "shamcash" ? "تأكيد والانتقال للدفع" : "تأكيد وإرسال عبر واتساب"}
              </Button>
            </div>
          </>
        )}

        {step === "shamcash_pay" && (
          <div className="space-y-4 pt-1">
            {creatingInvoice ? (
              <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">جاري إنشاء فاتورة شام كاش...</p>
              </div>
            ) : invoiceError && !invoiceNumber ? (
              <div className="space-y-3 py-2">
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{invoiceError}</AlertDescription>
                </Alert>
                <Button
                  className="w-full gap-2"
                  onClick={() => orderId && createShamCashInvoice(orderId)}
                  disabled={!orderId || creatingInvoice}
                >
                  <RefreshCw className="h-4 w-4" />
                  إعادة إنشاء الفاتورة
                </Button>
              </div>
            ) : (
              <>
                <Alert className="border-primary/30 bg-primary/5">
                  <Wallet className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm space-y-2">
                    <p>ادفع المبلغ من تطبيق شام كاش باستخدام رقم الفاتورة أدناه.</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-base font-bold tracking-wide flex-1 dir-ltr text-left" dir="ltr">
                        {invoiceNumber}
                      </p>
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={copyInvoice}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p>
                      المبلغ:{" "}
                      <span className="font-display font-bold">{totalPrice.toLocaleString()} ل.س</span>
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      {checkingPayment && <Loader2 className="h-3 w-3 animate-spin" />}
                      نتحقق تلقائياً من نجاح الدفع عبر شام كاش...
                    </p>
                  </AlertDescription>
                </Alert>

                {paymentUrl && (
                  <Button
                    type="button"
                    className="w-full gap-2 font-semibold"
                    onClick={() => window.open(paymentUrl, "_blank", "noopener,noreferrer")}
                  >
                    <Wallet className="h-4 w-4" />
                    فتح صفحة الدفع في شام كاش
                  </Button>
                )}

                {invoiceError && (
                  <div className="space-y-2">
                    <Alert variant="destructive">
                      <AlertDescription className="text-sm">{invoiceError}</AlertDescription>
                    </Alert>
                    {invoiceError.includes("انتهت") && orderId && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => {
                          setInvoiceNumber("");
                          setInvoiceError("");
                          createShamCashInvoice(orderId);
                        }}
                      >
                        <RefreshCw className="h-4 w-4" />
                        إنشاء فاتورة جديدة
                      </Button>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="tranId">رقم العملية من تطبيق شام كاش (اختياري إن اكتُشف الدفع تلقائياً)</Label>
                  <Input
                    id="tranId"
                    placeholder="مثال: 12345678"
                    value={tranId}
                    onChange={(e) => setTranId(e.target.value)}
                    className="font-mono"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">
                    إن لم يُحدَّث الدفع تلقائياً، أدخل رقم العملية بعد التحويل واضغط تأكيد.
                  </p>
                </div>

                <Button
                  className="w-full gap-2 font-semibold"
                  onClick={handleVerifyPayment}
                  disabled={verifying || !tranId.trim()}
                >
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  التحقق من الدفع عبر شام كاش
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={async () => {
                    if (!orderId) return;
                    setCheckingPayment(true);
                    const status = await pollPaymentStatus(orderId);
                    setCheckingPayment(false);
                    if (status?.paymentStatus === "paid") {
                      setStep("paid");
                      if (!paidToastShown.current) {
                        paidToastShown.current = true;
                        toast({ title: "تم تأكيد الدفع بنجاح ✅" });
                      }
                    } else {
                      toast({
                        title: "لم يُؤكد الدفع بعد",
                        description: "أكمل التحويل في شام كاش أو أدخل رقم العملية",
                      });
                    }
                  }}
                  disabled={checkingPayment || verifying}
                >
                  {checkingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  تحديث حالة الدفع
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full gap-2"
                  onClick={() => {
                    openWhatsApp(
                      invoiceNumber
                        ? `⏳ بانتظار دفع شام كاش\n🧾 الفاتورة: ${invoiceNumber}`
                        : undefined,
                    );
                    resetForm();
                    onOpenChange(false);
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  إرسال الطلب عبر واتساب ومتابعة لاحقاً
                </Button>
              </>
            )}
          </div>
        )}

        {step === "paid" && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <div>
              <p className="font-semibold text-lg">تم تأكيد دفع شام كاش</p>
              <p className="text-sm text-muted-foreground mt-1">سيتابع التاجر تجهيز طلبك</p>
            </div>
            {invoiceNumber && (
              <p className="text-xs font-mono text-muted-foreground" dir="ltr">
                {invoiceNumber}
              </p>
            )}
            <Button className="w-full gap-2" onClick={handleCloseAfterPaid}>
              <MessageCircle className="h-4 w-4" />
              إبلاغ التاجر عبر واتساب
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OrderFormModal;
