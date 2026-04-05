import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Package, MessageCircle, Store, Loader2, Ban, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/integrations/supabase/db-types";
import OrderFormModal from "@/components/OrderFormModal";

const DEFAULT_WHATSAPP = "963954170549";
const TRIAL_DAYS = 7;

const Storefront = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState("SyriaBiz Store");
  const [whatsapp, setWhatsapp] = useState(DEFAULT_WHATSAPP);
  const [suspended, setSuspended] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const fetchStore = async () => {
      setLoading(true);

      const { data: profile } = await supabase
        .from("profiles" as any)
        .select("*")
        .eq("id", storeId!)
        .single();

      if (profile) {
        const p = profile as any;
        setStoreName(p.store_name || "SyriaBiz Store");
        setWhatsapp(p.whatsapp_number || DEFAULT_WHATSAPP);

        if (p.status === "suspended") {
          setSuspended(true);
          setLoading(false);
          return;
        }

        // Check trial expiry for free plans
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

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("merchant_id", storeId!)
        .order("created_at", { ascending: false });

      if (!error && data) setProducts(data);
      setLoading(false);
    };

    if (storeId) fetchStore();
  }, [storeId]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b px-4 py-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <Store className="h-5 w-5 text-secondary" />
          <h1 className="text-lg font-display font-bold tracking-tight">{storeName}</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1">تصفّح المنتجات واطلب مباشرة</p>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
            <p className="text-sm text-muted-foreground">جاري تحميل المنتجات...</p>
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
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden flex flex-col">
                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Package className="h-10 w-10 text-muted-foreground/40" />
                  )}
                </div>
                <div className="p-3 flex flex-col flex-1 gap-2">
                  <h3 className="font-semibold text-sm leading-tight">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                  )}
                  <span className="font-display font-bold text-sm text-secondary mt-auto">
                    {Number(product.price).toLocaleString()} ل.س
                  </span>
                  <Button
                    className="w-full bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 gap-1.5 text-xs font-semibold"
                    size="sm"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    اطلب عبر واتساب
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground border-t mt-8">
        مدعوم من Syria<span className="text-secondary font-semibold">Biz</span>
      </footer>

      {selectedProduct && storeId && (
        <OrderFormModal
          open={!!selectedProduct}
          onOpenChange={(v) => { if (!v) setSelectedProduct(null); }}
          product={selectedProduct}
          merchantId={storeId}
          whatsapp={whatsapp}
        />
      )}
    </div>
  );
};

export default Storefront;
