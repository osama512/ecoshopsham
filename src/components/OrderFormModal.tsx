import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MessageCircle, Tag, CheckCircle2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/integrations/supabase/db-types";
import { formatSyrianWhatsApp, isValidPhone } from "@/lib/phone";

interface ShippingZone {
  id: string;
  name: string;
  price: number;
}

interface PaymentMethodConfig {
  cash: boolean;
  syriatel_cash: boolean;
  haram_transfer: boolean;
}

const ALL_PAYMENT_LABELS: Record<string, string> = {
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

const OrderFormModal = ({ open, onOpenChange, product, merchantId, whatsapp }: OrderFormModalProps) => {
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [selectedShippingId, setSelectedShippingId] = useState("");
  const [saving, setSaving] = useState(false);

  // Dynamic merchant settings
  const [activePayments, setActivePayments] = useState<{ value: string; label: string }[]>([]);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Coupon state
  const [promoCode, setPromoCode] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_type: string; discount_value: number } | null>(null);
  const [promoError, setPromoError] = useState("");

  useEffect(() => {
    if (!open || settingsLoaded) return;
    const fetchSettings = async () => {
      // Fetch store_settings
      const { data } = await supabase
        .from("store_settings" as any)
        .select("*")
        .eq("merchant_id", merchantId)
        .maybeSingle();

      if (data) {
        const d = data as any;
        const pm = d.payment_methods as PaymentMethodConfig | null;
        if (pm) {
          const active = Object.entries(pm)
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

      // Fetch payment_instructions from profiles
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
    : Object.entries(ALL_PAYMENT_LABELS).map(([value, label]) => ({ value, label }));

  useEffect(() => {
    if (!paymentMethod && payments.length > 0) {
      setPaymentMethod(payments[0].value);
    }
  }, [payments, paymentMethod]);

  const selectedShipping = shippingZones.find((z) => z.id === selectedShippingId);
  const shippingCost = selectedShipping?.price ?? 0;
  const productSubtotal = Number(product.price);
  const discountAmount = appliedCoupon
    ? appliedCoupon.discount_type === 'fixed'
      ? Math.min(appliedCoupon.discount_value, productSubtotal)
      : Math.round(productSubtotal * appliedCoupon.discount_value / 100)
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
    setAppliedCoupon({ code: data.code, discount_type: data.discount_type, discount_value: Number(data.discount_value) });
  };

  const phoneValid = isValidPhone(phone);

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

    const { error } = await (supabase.from("orders") as any).insert({
      merchant_id: merchantId,
      customer_name: fullName.trim(),
      customer_phone: phone.trim(),
      order_details: [orderDetails],
      total_price: totalPrice,
      status: "pending",
    });

    setSaving(false);

    if (error) {
      console.error("Order save error:", error);
    }

    const paymentLabel = payments.find((p) => p.value === paymentMethod)?.label ?? paymentMethod;
    let message =
      `🛒 طلب جديد من SyriaBiz\n\n` +
      `📦 المنتج: ${product.name}\n` +
      `💰 المجموع: ${productSubtotal.toLocaleString()} ل.س\n`;

    if (appliedCoupon) {
      const discLabel = appliedCoupon.discount_type === 'fixed'
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

    const num = formatSyrianWhatsApp(whatsapp);
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${num}?text=${encoded}`;
    window.open(url, "_blank", "noopener,noreferrer");

    setFullName("");
    setCity("");
    setAddress("");
    setPhone("");
    setPaymentMethod("");
    setSelectedShippingId("");
    setPromoCode("");
    setAppliedCoupon(null);
    setPromoError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">🛒 تأكيد الطلب</DialogTitle>
        </DialogHeader>

        {/* Product summary */}
        <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-14 h-14 rounded-md object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-xs">📦</div>
          )}
          <div>
            <p className="font-semibold text-sm">{product.name}</p>
            <p className="font-display font-bold text-secondary text-sm">{Number(product.price).toLocaleString()} ل.س</p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">الاسم الكامل *</Label>
            <Input id="fullName" placeholder="أحمد محمد" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">رقم الهاتف *</Label>
            <Input id="phone" placeholder="09XXXXXXXX أو +1234567890" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={16} />
            {phone.trim() && !phoneValid && (
              <p className="text-xs text-destructive">أدخل رقم هاتف صحيح (مثال: 0932052427 أو +1234567890)</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>المدينة *</Label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
              <SelectContent>
                {SYRIAN_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">العنوان التفصيلي *</Label>
            <Input id="address" placeholder="الحي، الشارع، البناء..." value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          {/* Dynamic Shipping Zones */}
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

          {/* Dynamic Payment Methods */}
          <div className="space-y-1.5">
            <Label>طريقة الدفع</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="gap-2">
              {payments.map((pm) => (
                <div key={pm.value} className="flex items-center gap-2 rounded-lg border p-2.5">
                  <RadioGroupItem value={pm.value} id={pm.value} />
                  <Label htmlFor={pm.value} className="cursor-pointer text-sm font-medium flex-1">{pm.label}</Label>
                </div>
              ))}
            </RadioGroup>

            {/* Payment Instructions Info Box */}
            {paymentMethod && paymentMethod !== "cash" && paymentInstructions && (
              <Alert className="border-primary/30 bg-primary/5">
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm whitespace-pre-line">
                  {paymentInstructions}
                  <p className="text-xs text-muted-foreground mt-2 font-medium">
                    يرجى إتمام التحويل وإرفاق صورة الإشعار في محادثة الواتساب التالية
                  </p>
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
                onChange={(e) => { setPromoCode(e.target.value); setPromoError(""); setAppliedCoupon(null); }}
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
                {promoChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : appliedCoupon ? <CheckCircle2 className="h-4 w-4" /> : "تطبيق"}
              </Button>
            </div>
            {promoError && <p className="text-xs text-destructive">{promoError}</p>}
            {appliedCoupon && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                خصم {appliedCoupon.discount_type === 'fixed' ? `${appliedCoupon.discount_value.toLocaleString()} ل.س` : `${appliedCoupon.discount_value}%`} — {appliedCoupon.code}
              </Badge>
            )}
          </div>

          {/* Order Summary */}
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
            disabled={saving || !fullName.trim() || !city || !address.trim() || !phoneValid}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            تأكيد وإرسال عبر واتساب
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderFormModal;
