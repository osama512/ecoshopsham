import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/integrations/supabase/db-types";

const SYRIAN_CITIES = [
  "دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس", "دير الزور",
  "الرقة", "الحسكة", "درعا", "السويداء", "القنيطرة", "إدلب", "ريف دمشق",
];

const PAYMENT_METHODS = [
  { value: "cash", label: "الدفع عند الاستلام" },
  { value: "syriatel_cash", label: "سيريتل كاش" },
  { value: "haram_transfer", label: "حوالة الهرم" },
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
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saving, setSaving] = useState(false);

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
    };

    const { error } = await (supabase.from("orders") as any).insert({
      merchant_id: merchantId,
      customer_name: fullName.trim(),
      customer_phone: phone.trim(),
      order_details: [orderDetails],
      total_price: product.price,
      status: "pending",
    });

    setSaving(false);

    if (error) {
      console.error("Order save error:", error);
    }

    const paymentLabel = PAYMENT_METHODS.find((p) => p.value === paymentMethod)?.label ?? paymentMethod;
    const message = encodeURIComponent(
      `🛒 طلب جديد من SyriaBiz\n\n` +
      `📦 المنتج: ${product.name}\n` +
      `💰 السعر: ${Number(product.price).toLocaleString()} ل.س\n` +
      `👤 الاسم: ${fullName.trim()}\n` +
      `📱 الهاتف: ${phone.trim()}\n` +
      `🏙️ المدينة: ${city}\n` +
      `📍 العنوان: ${address.trim()}\n` +
      `💳 الدفع: ${paymentLabel}`
    );

    const num = whatsapp.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${num}?text=${message}`, "_blank");

    // Reset
    setFullName("");
    setCity("");
    setAddress("");
    setPhone("");
    setPaymentMethod("cash");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">🛒 تأكيد الطلب</DialogTitle>
        </DialogHeader>

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

          <div className="space-y-1.5">
            <Label>طريقة الدفع</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <div key={pm.value} className="flex items-center gap-2 rounded-lg border p-2.5">
                  <RadioGroupItem value={pm.value} id={pm.value} />
                  <Label htmlFor={pm.value} className="cursor-pointer text-sm font-medium flex-1">{pm.label}</Label>
                </div>
              ))}
            </RadioGroup>
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
