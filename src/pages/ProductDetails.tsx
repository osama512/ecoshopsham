import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, MessageCircle, Loader2, Package, Ban, Clock, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/integrations/supabase/db-types";
import OrderFormModal from "@/components/OrderFormModal";
import ProductImageCarousel from "@/components/ProductImageCarousel";
import { extractIdFromSlug } from "@/lib/slug";

const DEFAULT_WHATSAPP = "963954170549";
const TRIAL_DAYS = 7;

const ProductDetails = () => {
  const { slug, id: legacyId } = useParams<{ slug?: string; id?: string }>();
  const productId = slug ? extractIdFromSlug(slug) : legacyId;
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState("SyriaBiz Store");
  const [whatsapp, setWhatsapp] = useState(DEFAULT_WHATSAPP);
  const [merchantId, setMerchantId] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [showOrder, setShowOrder] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      // Try exact UUID match first, then short-id prefix match
      let prod: any = null;
      const { data: exact } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId!)
        .eq("is_visible", true)
        .maybeSingle();
      prod = exact;

      if (!prod && productId) {
        // Short ID prefix: query all visible and find match
        const { data: all } = await supabase
          .from("products")
          .select("*")
          .eq("is_visible", true);
        prod = all?.find((p: any) => p.id.replace(/-/g, "").startsWith(productId)) || null;
      }

      // Dummy reference to satisfy original .single() flow
      const __unused = await supabase
        .from("products")
        .select("id")
        .eq("id", "00000000-0000-0000-0000-000000000000")
        .eq("is_visible", true)
        .single();

      if (!prod) {
        setLoading(false);
        return;
      }
      const p = prod as Product;
      setProduct(p);
      setMerchantId(p.merchant_id || "");

      if (p.merchant_id) {
        const { data: profile } = await supabase
          .from("profiles" as any)
          .select("*")
          .eq("id", p.merchant_id)
          .single();

        if (profile) {
          const p = profile as any;
          setStoreName(p.store_name || "SyriaBiz Store");
          setWhatsapp(p.whatsapp_number || DEFAULT_WHATSAPP);

          if (p.status === "suspended") { setUnavailable(true); }

          const planType = p.plan_type ?? "free";
          if (planType !== "pro" && planType !== "enterprise" && p.created_at) {
            const diff = (Date.now() - new Date(p.created_at).getTime()) / 86400000;
            if (diff > TRIAL_DAYS) setUnavailable(true);
          }
        }
      }
      setLoading(false);
    };
    if (productId) fetch();
  }, [productId]);

  const outOfStock = (product?.stock_quantity ?? 0) <= 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Package className="h-14 w-14 opacity-40" />
        <p className="font-semibold text-lg">المنتج غير موجود</p>
        <Button variant="outline" onClick={() => navigate(-1)}>العودة</Button>
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Ban className="h-14 w-14 opacity-40 text-destructive" />
        <p className="font-semibold text-lg">هذا المتجر غير متاح حالياً</p>
        <Button variant="outline" onClick={() => navigate(-1)}>العودة</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => {
              if (product.merchant_id) navigate(`/s/${product.merchant_id}`);
              else navigate(-1);
            }}
          >
            <ArrowRight className="h-4 w-4" />
            العودة للمتجر
          </Button>
          <div className="mr-auto flex items-center gap-1.5">
            <Store className="h-4 w-4 text-secondary" />
            <span className="text-sm font-display font-semibold">{storeName}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {/* Image */}
        <ProductImageCarousel
          images={product.images || []}
          imageUrl={product.image_url}
          alt={product.name}
          className="w-full aspect-square sm:aspect-[4/3]"
        />

        {/* Details */}
        <div className="p-5 space-y-5">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <h1 className="text-xl font-display font-bold leading-tight flex-1">{product.name}</h1>
              {outOfStock && (
                <Badge variant="destructive" className="shrink-0 text-xs">نفذت الكمية</Badge>
              )}
            </div>
            <p className="font-display font-bold text-xl text-secondary">
              {Number(product.price).toLocaleString()} ل.س
            </p>
          </div>

          {/* Description */}
          {product.description && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">وصف المنتج</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {/* Stock info */}
          {!outOfStock && (product.stock_quantity ?? 0) > 0 && (
            <p className="text-xs text-muted-foreground">
              المتوفر: {product.stock_quantity} قطعة
            </p>
          )}

          {/* CTA */}
          <Button
            className="w-full bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 gap-2 font-semibold text-base py-6"
            onClick={() => setShowOrder(true)}
            disabled={outOfStock}
          >
            <MessageCircle className="h-5 w-5" />
            {outOfStock ? "نفذت الكمية" : "اطلب عبر واتساب"}
          </Button>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground border-t mt-4">
        مدعوم من Syria<span className="text-secondary font-semibold">Biz</span>
      </footer>

      {showOrder && merchantId && (
        <OrderFormModal
          open={showOrder}
          onOpenChange={setShowOrder}
          product={product}
          merchantId={merchantId}
          whatsapp={whatsapp}
        />
      )}
    </div>
  );
};

export default ProductDetails;
