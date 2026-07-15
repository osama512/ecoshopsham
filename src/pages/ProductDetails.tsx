import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Package, Ban, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/integrations/supabase/db-types";
import OrderFormModal from "@/components/OrderFormModal";
import ProductImageCarousel from "@/components/ProductImageCarousel";
import WhatsAppChatButton from "@/components/WhatsAppChatButton";
import StorefrontFooter from "@/components/StorefrontFooter";
import AddToCartControls from "@/components/AddToCartControls";
import { StoreCartButton } from "@/components/StoreCart";
import { extractIdFromSlug } from "@/lib/slug";
import { isCustomDomainHost, storefrontPathForMerchant } from "@/lib/customDomain";
import {
  DEFAULT_STORE_THEME,
  ensureStoreFont,
  parseStoreTheme,
  themeToCssVars,
  type StoreTheme,
} from "@/lib/storeTheme";
import { formatStorePrice } from "@/lib/currency";
import { useStoreBrandingMeta } from "@/hooks/useStoreBrandingMeta";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_WHATSAPP = "963954170549";
const TRIAL_DAYS = 7;

const ProductDetails = () => {
  const { slug, id: legacyId } = useParams<{ slug?: string; id?: string }>();
  const productId = slug ? extractIdFromSlug(slug) : legacyId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setMerchantId: setCartMerchant, items, clearCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState("ecoshopsham Store");
  const [whatsapp, setWhatsapp] = useState(DEFAULT_WHATSAPP);
  const [merchantId, setMerchantId] = useState("");
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [domainStatus, setDomainStatus] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [theme, setTheme] = useState<StoreTheme>({ ...DEFAULT_STORE_THEME });

  useStoreBrandingMeta(
    !loading && product && !unavailable ? storeName : null,
    !loading && product && !unavailable ? theme.logo_url : null,
  );

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setTheme({ ...DEFAULT_STORE_THEME });
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


      if (!prod) {
        setLoading(false);
        return;
      }
      const p = prod as Product;
      setProduct(p);
      setMerchantId(p.merchant_id || "");
      if (p.merchant_id) setCartMerchant(p.merchant_id);

      if (p.merchant_id) {
        const [{ data: profile }, { data: settings }] = await Promise.all([
          supabase
            .from("profiles" as any)
            .select("*")
            .eq("id", p.merchant_id)
            .single(),
          supabase
            .from("store_settings" as any)
            .select("theme")
            .eq("merchant_id", p.merchant_id)
            .maybeSingle(),
        ]);

        if (profile) {
          const pr = profile as any;
          setStoreName(pr.store_name || "ecoshopsham Store");
          setWhatsapp(pr.whatsapp_number || DEFAULT_WHATSAPP);
          setStoreSlug(pr.store_slug ?? null);
          setCustomDomain(pr.custom_domain ?? null);
          setDomainStatus(pr.domain_status ?? null);

          if (pr.status === "suspended") { setUnavailable(true); }

          const planType = pr.plan_type ?? "free";
          if (planType !== "pro" && planType !== "enterprise" && pr.created_at) {
            const diff = (Date.now() - new Date(pr.created_at).getTime()) / 86400000;
            if (diff > TRIAL_DAYS) setUnavailable(true);
          }
        }

        if (settings) {
          const parsed = parseStoreTheme((settings as any).theme);
          setTheme(parsed);
          ensureStoreFont(parsed.font);
        }
      }
      setLoading(false);
    };
    if (productId) fetch();
  }, [productId]);

  const outOfStock = (product?.stock_quantity ?? 0) <= 0;

  const goToStore = () => {
    if (isCustomDomainHost()) {
      navigate("/");
      return;
    }
    if (product?.merchant_id) {
      navigate(
        storefrontPathForMerchant({
          storeSlug,
          merchantId: product.merchant_id,
          customDomain,
          domainStatus,
        })
      );
      return;
    }
    navigate(-1);
  };

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
    <div className="min-h-screen bg-background" dir="rtl" style={themeToCssVars(theme)}>
      <header className="relative z-10 bg-primary text-primary-foreground border-b border-primary/80 px-4 py-3 shadow-sm">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
            onClick={goToStore}
          >
            <ArrowRight className="h-4 w-4" />
            العودة للمتجر
          </Button>
          <div className="mr-auto flex items-center gap-1.5 min-w-0">
            {theme.logo_url ? (
              <img src={theme.logo_url} alt={storeName} className="h-6 w-6 rounded-full object-cover border border-primary-foreground/30" />
            ) : (
              <Store className="h-4 w-4 opacity-90" />
            )}
            <span className="text-sm font-display font-semibold truncate">{storeName}</span>
          </div>
          {!unavailable && (
            <StoreCartButton
              currency={theme.currency}
              onCheckout={() => {
                if (!items.length) {
                  toast({ title: "السلة فارغة", variant: "destructive" });
                  return;
                }
                setCheckoutOpen(true);
              }}
            />
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4">
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <ProductImageCarousel
            images={product.images || []}
            imageUrl={product.image_url}
            alt={product.name}
            className="w-full h-52 sm:h-64"
            objectFit="contain"
          />

          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <h1 className="text-lg font-display font-bold leading-tight flex-1">{product.name}</h1>
                {outOfStock && (
                  <Badge variant="destructive" className="shrink-0 text-xs">غير متوفر</Badge>
                )}
              </div>
              <p className="font-display font-bold text-lg text-secondary">
                {formatStorePrice(Number(product.price), theme.currency)}
              </p>
            </div>

            {product.description && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground">وصف المنتج</h2>
                <p className="text-sm leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}

            <AddToCartControls product={product} />
          </div>
        </div>
      </main>

      <StorefrontFooter
        storeName={storeName}
        storeKey={
          isCustomDomainHost()
            ? window.location.hostname.toLowerCase()
            : storeSlug || merchantId
        }
        footer={theme.footer}
        logoUrl={theme.logo_url}
      />

      {!unavailable && whatsapp && (
        <WhatsAppChatButton whatsapp={whatsapp} storeName={storeName} />
      )}

      {merchantId && (
        <OrderFormModal
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          items={items}
          merchantId={merchantId}
          whatsapp={whatsapp}
          storeName={storeName}
          logoUrl={theme.logo_url}
          currency={theme.currency}
          onOrderComplete={clearCart}
        />
      )}
    </div>
  );
};

export default ProductDetails;
