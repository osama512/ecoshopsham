import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Loader2, FileText, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_STORE_THEME,
  ensureStoreFont,
  parseStoreTheme,
  themeToCssVars,
  type StoreTheme,
  type StoreFooterPage,
} from "@/lib/storeTheme";
import { useStoreBrandingMeta } from "@/hooks/useStoreBrandingMeta";
import StorefrontFooter from "@/components/StorefrontFooter";
import { isCustomDomainHost, storefrontPathForMerchant } from "@/lib/customDomain";

type StoreInfoPageProps = {
  /** On custom domain, merchant host; otherwise taken from route */
  storeKey?: string;
};

async function resolveMerchantId(storeId: string): Promise<string | null> {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId);
  const looksLikeDomain = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(storeId);

  if (isUUID) return storeId;

  if (looksLikeDomain) {
    const { data } = await supabase
      .from("profiles" as any)
      .select("id")
      .eq("custom_domain", storeId.toLowerCase())
      .maybeSingle();
    return data ? (data as any).id : null;
  }

  const { data: slugProfile } = await supabase
    .from("profiles" as any)
    .select("id")
    .eq("store_slug", storeId)
    .maybeSingle();

  if (slugProfile) return (slugProfile as any).id;

  const { data: allProfiles } = await supabase.from("profiles" as any).select("id").limit(500);
  const match = (allProfiles as any[] | null)?.find(
    (p) => p.id.replace(/-/g, "").slice(0, 6) === storeId,
  );
  return match?.id ?? null;
}

const StoreInfoPage = ({ storeKey: storeKeyProp }: StoreInfoPageProps) => {
  const { storeId: paramStoreId, pageSlug } = useParams<{ storeId?: string; pageSlug: string }>();
  const storeKey =
    storeKeyProp ||
    paramStoreId ||
    (typeof window !== "undefined" && isCustomDomainHost()
      ? window.location.hostname.toLowerCase()
      : "");

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [storeName, setStoreName] = useState("المتجر");
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [merchantId, setMerchantId] = useState("");
  const [theme, setTheme] = useState<StoreTheme>({
    ...DEFAULT_STORE_THEME,
    footer: { about: null, socials: [], pages: [] },
  });
  const [page, setPage] = useState<StoreFooterPage | null>(null);

  useStoreBrandingMeta(!loading && !notFound ? `${page?.title || ""} | ${storeName}` : null, theme.logo_url);

  useEffect(() => {
    const run = async () => {
      if (!storeKey || !pageSlug) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      setNotFound(false);

      const merchant = await resolveMerchantId(storeKey);
      if (!merchant) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setMerchantId(merchant);

      const [{ data: profile }, { data: settings }] = await Promise.all([
        supabase.from("profiles" as any).select("store_name, store_slug").eq("id", merchant).single(),
        supabase.from("store_settings" as any).select("theme").eq("merchant_id", merchant).maybeSingle(),
      ]);

      if (profile) {
        const pr = profile as any;
        setStoreName(pr.store_name || "المتجر");
        setStoreSlug(pr.store_slug ?? null);
      }

      const parsed = parseStoreTheme((settings as any)?.theme);
      setTheme(parsed);
      ensureStoreFont(parsed.font);

      const decoded = decodeURIComponent(pageSlug);
      const found =
        parsed.footer.pages.find((p) => p.slug === decoded) ||
        parsed.footer.pages.find((p) => p.id === decoded) ||
        null;

      if (!found) {
        setNotFound(true);
        setPage(null);
      } else {
        setPage(found);
      }
      setLoading(false);
    };

    run();
  }, [storeKey, pageSlug]);

  const homePath = storefrontPathForMerchant({
    storeSlug,
    merchantId: merchantId || storeKey,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" style={themeToCssVars(theme)} dir="rtl">
      <header className="bg-primary text-primary-foreground px-4 py-3 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
          >
            <Link to={homePath}>
              <ArrowRight className="h-4 w-4" />
              العودة للمتجر
            </Link>
          </Button>
          <div className="mr-auto flex items-center gap-1.5">
            {theme.logo_url ? (
              <img
                src={theme.logo_url}
                alt={storeName}
                className="h-6 w-6 rounded-full object-cover border border-primary-foreground/30"
              />
            ) : (
              <Store className="h-4 w-4" />
            )}
            <span className="text-sm font-display font-semibold">{storeName}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {notFound || !page ? (
          <div className="text-center py-16 text-muted-foreground space-y-2">
            <FileText className="h-12 w-12 mx-auto opacity-40" />
            <p className="font-semibold text-lg">الصفحة غير موجودة</p>
            <Button asChild variant="outline" size="sm">
              <Link to={homePath}>العودة للمتجر</Link>
            </Button>
          </div>
        ) : (
          <article className="rounded-xl border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
            <h1 className="text-xl font-display font-bold">{page.title}</h1>
            <div className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
              {page.content || "لا يوجد محتوى بعد."}
            </div>
          </article>
        )}
      </main>

      <StorefrontFooter
        storeName={storeName}
        storeKey={storeSlug || merchantId || storeKey}
        footer={theme.footer}
        logoUrl={theme.logo_url}
      />
    </div>
  );
};

export default StoreInfoPage;
