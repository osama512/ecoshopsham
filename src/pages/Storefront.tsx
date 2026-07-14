import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Package, MessageCircle, Store, Loader2, Ban, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/integrations/supabase/db-types";
import OrderFormModal from "@/components/OrderFormModal";
import ProductImageCarousel from "@/components/ProductImageCarousel";
import StorefrontBanner from "@/components/StorefrontBanner";
import { productSlug } from "@/lib/slug";
import {
  DEFAULT_STORE_THEME,
  ensureStoreFont,
  parseStoreTheme,
  themeToCssVars,
  type StoreTheme,
} from "@/lib/storeTheme";

const DEFAULT_WHATSAPP = "963954170549";
const TRIAL_DAYS = 7;

type StorefrontProps = {
  /** Override route param — merchant UUID, store_slug, short id, or custom domain hostname */
  storeKey?: string;
};

const Storefront = ({ storeKey }: StorefrontProps) => {
  const { storeId: paramStoreId } = useParams<{ storeId: string }>();
  const storeId = storeKey || paramStoreId;
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState("ecoshopsham Store");
  const [whatsapp, setWhatsapp] = useState(DEFAULT_WHATSAPP);
  const [suspended, setSuspended] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [resolvedMerchantId, setResolvedMerchantId] = useState<string>("");
  const [theme, setTheme] = useState<StoreTheme>({ ...DEFAULT_STORE_THEME });

  useEffect(() => {
    const fetchStore = async () => {
      setLoading(true);
      setNotFound(false);
      setSuspended(false);
      setTrialExpired(false);
      setTheme({ ...DEFAULT_STORE_THEME });

      let merchantId = storeId!;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId!);
      const looksLikeDomain = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(storeId!);

      if (!isUUID) {
        if (looksLikeDomain) {
          const { data: domainProfile } = await supabase
            .from("profiles" as any)
            .select("id")
            .eq("custom_domain", storeId!.toLowerCase())
            .maybeSingle();
          if (domainProfile) {
            merchantId = (domainProfile as any).id;
          } else {
            setNotFound(true);
            setLoading(false);
            return;
          }
        } else {
          const { data: slugProfile } = await supabase
            .from("profiles" as any)
            .select("id")
            .eq("store_slug", storeId!)
            .maybeSingle();

          if (slugProfile) {
            merchantId = (slugProfile as any).id;
          } else {
            const { data: allProfiles } = await supabase
              .from("profiles" as any)
              .select("id")
              .limit(500);

            if (allProfiles) {
              const match = (allProfiles as any[]).find(
                (p: any) => p.id.replace(/-/g, "").slice(0, 6) === storeId
              );
              if (match) merchantId = match.id;
            }
          }
        }
      }

      const { data: profile } = await supabase
        .from("profiles" as any)
        .select("*")
        .eq("id", merchantId)
        .single();

      if (!profile) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (profile) {
        const p = profile as any;
        setStoreName(p.store_name || "ecoshopsham Store");
        setWhatsapp(p.whatsapp_number || DEFAULT_WHATSAPP);

        if (p.status === "suspended") {
          setSuspended(true);
          setLoading(false);
          return;
        }

        const planType = p.plan_type ?? "free";
        if (planType !== "pro" && planType !== "enterprise" && p.created_at) {
          const diffDays = (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays > TRIAL_DAYS) {
            setTrialExpired(true);
            setLoading(false);
            return;
          }
        }
      }

      setResolvedMerchantId(merchantId);

      const [{ data, error }, { data: settings }] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("merchant_id", merchantId)
          .eq("is_visible", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("store_settings" as any)
          .select("theme")
          .eq("merchant_id", merchantId)
          .maybeSingle(),
      ]);

      if (!error && data) setProducts(data);
      if (settings) {
        const parsed = parseStoreTheme((settings as any).theme);
        setTheme(parsed);
        ensureStoreFont(parsed.font);
      }
      setLoading(false);
    };

    if (storeId) fetchStore();
  }, [storeId]);

  return (
    <div className="min-h-screen bg-background" style={themeToCssVars(theme)}>
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b px-4 py-4 text-center">
        <div className="flex items-center justify-center gap-2">
          {theme.logo_url ? (
            <img
              src={theme.logo_url}
              alt={storeName}
              className="h-8 w-8 rounded-full object-cover border"
            />
          ) : (
            <Store className="h-5 w-5 text-secondary" />
          )}
          <h1 className="text-lg font-display font-bold tracking-tight">{storeName}</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {theme.tagline || "تصفّح المنتجات واطلب مباشرة"}
        </p>
      </header>

      {!loading && !notFound && !suspended && !trialExpired && theme.banners.length > 0 && (
        <StorefrontBanner banners={theme.banners} storeName={storeName} />
      )}

      <main className="px-4 py-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
            <p className="text-sm text-muted-foreground">جاري تحميل المنتجات...</p>
          </div>
        ) : notFound ? (
          <div className="text-center py-20 text-muted-foreground">
            <Store className="h-14 w-14 mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-lg">المتجر غير موجود</p>
            <p className="text-sm mt-1">تحقق من الرابط أو إعدادات النطاق</p>
          </div>
        ) : suspended ? (
          <div className="text-center py-20 text-muted-foreground">
            <Ban className="h-14 w-14 mx-auto mb-3 opacity-40 text-destructive" />
            <p className="font-semibold text-lg">هذا المتجر غير متاح حالياً</p>
            <p className="text-sm mt-1">يرجى المحاولة لاحقاً</p>
          </div>
        ) : trialExpired ? (
          <div className="text-center py-20 text-muted-foreground">
            <Clock className="h-14 w-14 mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-lg">هذا المتجر غير متاح حالياً</p>
            <p className="text-sm mt-1">انتهت فترة التجربة المجانية لصاحب المتجر</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Package className="h-14 w-14 mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-lg">لا توجد منتجات</p>
            <p className="text-sm mt-1">هذا المتجر لم يضف منتجات بعد</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => {
              const outOfStock = (product.stock_quantity ?? 0) <= 0;
              return (
                <Card key={product.id} className="overflow-hidden flex flex-col relative">
                  {outOfStock && (
                    <Badge variant="destructive" className="absolute top-2 right-2 z-10 text-[10px]">
                      نفذت الكمية
                    </Badge>
                  )}
                  <div
                    className="cursor-pointer"
                    onClick={() => navigate(`/p/${productSlug(product.id, product.name)}`)}
                  >
                    <ProductImageCarousel
                      images={product.images || []}
                      imageUrl={product.image_url}
                      alt={product.name}
                      className="aspect-square"
                    />
                  </div>
                  <div className="p-3 flex flex-col flex-1 gap-2">
                    <h3
                      className="font-semibold text-sm leading-tight cursor-pointer hover:text-secondary transition-colors"
                      onClick={() => navigate(`/p/${productSlug(product.id, product.name)}`)}
                    >{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">{product.description}</p>
                    )}
                    <span className="font-display font-bold text-sm text-secondary mt-auto">
                      {Number(product.price).toLocaleString()} ل.س
                    </span>
                    <Button
                      className="w-full bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 gap-1.5 text-xs font-semibold"
                      size="sm"
                      onClick={() => setSelectedProduct(product)}
                      disabled={outOfStock}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {outOfStock ? "نفذت الكمية" : "اطلب عبر واتساب"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground border-t mt-8">
        مدعوم من ecoshop<span className="text-secondary font-semibold">sham</span>
      </footer>

      {selectedProduct && resolvedMerchantId && (
        <OrderFormModal
          open={!!selectedProduct}
          onOpenChange={(v) => { if (!v) setSelectedProduct(null); }}
          product={selectedProduct}
          merchantId={resolvedMerchantId}
          whatsapp={whatsapp}
        />
      )}
    </div>
  );
};

export default Storefront;
