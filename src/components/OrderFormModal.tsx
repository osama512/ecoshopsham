import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/integrations/supabase/db-types";

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
  syriatel_cash: "سيريتل كاش",
  haram_transfer: "حوالة الهرم",
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
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    if (!open || settingsLoaded) return;
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("store_settings" as any)
        .select("*")
        .eq("merchant_id", merchantId)
        .maybeSingle();

      if (data) {
        const d = data as any;
        // Build active payment methods
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
        // Shipping zones
        if (d.shipping_zones && Array.isArray(d.shipping_zones) && d.shipping_zones.length > 0) {
          setShippingZones(d.shipping_zones);
        }
      }

      // Fallback: if no settings found, use all payment methods
      setSettingsLoaded(true);
    };
    fetchSettings();
  }, [open, merchantId, settingsLoaded]);

  // Fallback defaults if merchant has no settings
  const payments = activePayments.length > 0
    ? activePayments
    : Object.entries(ALL_PAYMENT_LABELS).map(([value, label]) => ({ value, label }));

  // Set default payment if not set
  useEffect(() => {
    if (!paymentMethod && payments.length > 0) {
      setPaymentMethod(payments[0].value);
    }
  }, [payments, paymentMethod]);

  const selectedShipping = shippingZones.find((z) => z.id === selectedShippingId);
  const shippingCost = selectedShipping?.price ?? 0;
  const totalPrice = Number(product.price) + shippingCost;

  const handleSubmit = async () => {
    if (!fullName.trim() || !city || !address.trim() || !phone.trim()) return;

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
      `💰 السعر: ${Number(product.price).toLocaleString()} ل.س\n`;

    if (selectedShipping) {
      message += `🚚 الشحن: ${selectedShipping.name} — ${shippingCost.toLocaleString()} ل.س\n`;
      message += `💵 الإجمالي: ${totalPrice.toLocaleString()} ل.س\n`;
    }

    message +=
      `👤 الاسم: ${fullName.trim()}\n` +
      `📱 الهاتف: ${phone.trim()}\n` +
      `🏙️ المدينة: ${city}\n` +
      `📍 العنوان: ${address.trim()}\n` +
      `💳 الدفع: ${paymentLabel}`;

    const num = whatsapp.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`, "_blank");

    // Reset
    setFullName("");
    setCity("");
    setAddress("");
    setPhone("");
    setPaymentMethod("");
    setSelectedShippingId("");
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
            <Input id="phone" placeholder="09XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
          </div>

          {/* Order Summary */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>سعر المنتج</span>
              <span className="font-display font-bold">{Number(product.price).toLocaleString()} ل.س</span>
            </div>
            {selectedShipping && (
              <div className="flex justify-between text-sm">
                <span>الشحن ({selectedShipping.name})</span>
                <span className="font-display font-bold">{shippingCost.toLocaleString()} ل.س</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-border pt-1.5 mt-1.5">
              <span>الإجمالي</span>
              <span className="font-display text-secondary">{totalPrice.toLocaleString()} ل.س</span>
            </div>
          </div>

          <Button
            className="w-full bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 gap-2 font-semibold"
            onClick={handleSubmit}
            disabled={saving || !fullName.trim() || !city || !address.trim() || !phone.trim()}
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
