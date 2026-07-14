import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Save,
  Palette,
  Upload,
  Trash2,
  ImagePlus,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Package,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_STORE_THEME,
  MAX_STORE_BANNERS,
  MAX_PRODUCT_SLIDER,
  MIN_PRODUCT_SLIDER,
  STORE_FONTS,
  ensureStoreFont,
  parseStoreTheme,
  type StoreHeroMode,
  type StoreTheme,
} from "@/lib/storeTheme";
import type { Product } from "@/integrations/supabase/db-types";
import { Checkbox } from "@/components/ui/checkbox";

type CatalogProduct = Pick<Product, "id" | "name" | "image_url" | "images" | "is_visible" | "price">;

const StoreThemeSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [theme, setTheme] = useState<StoreTheme>({ ...DEFAULT_STORE_THEME });
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const fetchTheme = async () => {
      setLoading(true);
      const [{ data }, { data: products }] = await Promise.all([
        supabase
          .from("store_settings" as any)
          .select("theme")
          .eq("merchant_id", userId)
          .maybeSingle(),
        supabase
          .from("products")
          .select("id, name, image_url, images, is_visible, price")
          .eq("merchant_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      if (data) {
        const parsed = parseStoreTheme((data as any).theme);
        setTheme(parsed);
        ensureStoreFont(parsed.font);
      }
      setCatalog((products as CatalogProduct[]) || []);
      setLoading(false);
    };

    fetchTheme();
  }, [user?.id]);

  const toggleSliderProduct = (productId: string) => {
    setTheme((t) => {
      const selected = t.product_slider_ids.includes(productId);
      if (selected) {
        return { ...t, product_slider_ids: t.product_slider_ids.filter((id) => id !== productId) };
      }
      if (t.product_slider_ids.length >= MAX_PRODUCT_SLIDER) {
        return t;
      }
      return { ...t, product_slider_ids: [...t.product_slider_ids, productId] };
    });
  };

  const tryToggleSliderProduct = (productId: string) => {
    if (
      !theme.product_slider_ids.includes(productId) &&
      theme.product_slider_ids.length >= MAX_PRODUCT_SLIDER
    ) {
      toast({
        title: `يمكنك اختيار ${MAX_PRODUCT_SLIDER} منتجات كحد أقصى`,
        variant: "destructive",
      });
      return;
    }
    toggleSliderProduct(productId);
  };

  const moveSliderProduct = (productId: string, direction: -1 | 1) => {
    setTheme((t) => {
      const ids = [...t.product_slider_ids];
      const index = ids.indexOf(productId);
      if (index < 0) return t;
      const next = index + direction;
      if (next < 0 || next >= ids.length) return t;
      [ids[index], ids[next]] = [ids[next], ids[index]];
      return { ...t, product_slider_ids: ids };
    });
  };

  const productThumb = (p: CatalogProduct) => p.images?.[0] || p.image_url || null;

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!user) return null;
    if (!file.type.startsWith("image/")) {
      toast({ title: "يرجى اختيار صورة فقط", variant: "destructive" });
      return null;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "حجم الصورة كبير جداً (الحد 4 ميجابايت)", variant: "destructive" });
      return null;
    }
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${user.id}/theme/${folder}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(filePath, file);
    if (error) {
      toast({ title: "فشل رفع الصورة", description: error.message, variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const url = await uploadFile(file, "logo");
    if (url) setTheme((t) => ({ ...t, logo_url: url }));
    setUploading(false);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const remaining = MAX_STORE_BANNERS - theme.banners.length;
    if (remaining <= 0) {
      toast({ title: `يمكنك إضافة ${MAX_STORE_BANNERS} صور كحد أقصى`, variant: "destructive" });
      return;
    }
    setUploading(true);
    const urls: string[] = [];
    for (const file of files.slice(0, remaining)) {
      const url = await uploadFile(file, "banner");
      if (url) urls.push(url);
    }
    if (urls.length) setTheme((t) => ({ ...t, banners: [...t.banners, ...urls] }));
    setUploading(false);
  };

  const removeBanner = (index: number) => {
    setTheme((t) => ({ ...t, banners: t.banners.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload: StoreTheme = {
      ...theme,
      tagline: theme.tagline?.trim() || null,
      logo_url: theme.logo_url || null,
      banners: theme.banners.slice(0, MAX_STORE_BANNERS),
      product_slider_ids: theme.product_slider_ids.slice(0, MAX_PRODUCT_SLIDER),
    };

    const { error } = await (supabase.from("store_settings") as any).upsert(
      {
        merchant_id: user.id,
        theme: payload,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "merchant_id" },
    );

    if (error) {
      toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم حفظ مظهر المتجر! ✅" });
      setTheme(payload);
    }
    setSaving(false);
  };

  const handleReset = () => {
    setTheme({ ...DEFAULT_STORE_THEME, footer: theme.footer });
  };

  if (loading) {
    return (
      <Card className="p-5 flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-5">
      <div>
        <h2 className="font-semibold flex items-center gap-2">
          <Palette className="h-4 w-4 text-secondary" />
          مظهر المتجر
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          خصّص ألوان متجرك وخطه وبانر الواجهة. تظهر التغييرات للزبائن بعد الحفظ.
        </p>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="themePrimary">اللون الأساسي</Label>
          <div className="flex items-center gap-2">
            <input
              id="themePrimary"
              type="color"
              value={theme.primary}
              onChange={(e) => setTheme((t) => ({ ...t, primary: e.target.value }))}
              className="h-10 w-12 cursor-pointer rounded border border-input bg-background p-1"
            />
            <Input
              value={theme.primary}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (/^#[0-9a-fA-F]{6}$/.test(v)) setTheme((t) => ({ ...t, primary: v.toLowerCase() }));
              }}
              className="font-mono text-sm"
              dir="ltr"
              maxLength={7}
            />
          </div>
          <p className="text-xs text-muted-foreground">أزرار وعناصر رئيسية</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="themeAccent">لون التمييز</Label>
          <div className="flex items-center gap-2">
            <input
              id="themeAccent"
              type="color"
              value={theme.accent}
              onChange={(e) => setTheme((t) => ({ ...t, accent: e.target.value }))}
              className="h-10 w-12 cursor-pointer rounded border border-input bg-background p-1"
            />
            <Input
              value={theme.accent}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (/^#[0-9a-fA-F]{6}$/.test(v)) setTheme((t) => ({ ...t, accent: v.toLowerCase() }));
              }}
              className="font-mono text-sm"
              dir="ltr"
              maxLength={7}
            />
          </div>
          <p className="text-xs text-muted-foreground">الأسعار والروابط والعناوين المميزة</p>
        </div>
      </div>

      {/* Font */}
      <div className="space-y-2">
        <Label>نوع الخط</Label>
        <Select
          value={theme.font}
          onValueChange={(v) => {
            ensureStoreFont(v);
            setTheme((t) => ({ ...t, font: v }));
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STORE_FONTS.map((f) => (
              <SelectItem key={f.id} value={f.id} style={{ fontFamily: `"${f.id}", sans-serif` }}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground" style={{ fontFamily: `"${theme.font}", Cairo, sans-serif` }}>
          معاينة: مرحباً بكم في متجري
        </p>
      </div>

      {/* Tagline */}
      <div className="space-y-2">
        <Label htmlFor="tagline">شعار فرعي (اختياري)</Label>
        <Input
          id="tagline"
          placeholder="أفضل المنتجات بأسعار مميزة"
          value={theme.tagline || ""}
          onChange={(e) => setTheme((t) => ({ ...t, tagline: e.target.value }))}
          maxLength={80}
        />
      </div>

      {/* Logo */}
      <div className="space-y-2">
          <Label>شعار المتجر (اللوجو)</Label>
          <p className="text-xs text-muted-foreground">
            يظهر في رأس المتجر، وفي أيقونة تبويب المتصفح (Chrome)، ويُرفق رابطه في رسائل الطلب على واتساب.
          </p>
        <div className="flex items-center gap-3 flex-wrap">
          {theme.logo_url ? (
            <div className="relative">
              <img
                src={theme.logo_url}
                alt="شعار المتجر"
                className="h-16 w-16 rounded-full object-cover border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -left-2 h-6 w-6"
                onClick={() => setTheme((t) => ({ ...t, logo_url: null }))}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
              بدون
            </div>
          )}
          <div>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={uploading}
              onClick={() => logoInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              رفع شعار
            </Button>
          </div>
        </div>
      </div>

      {/* Hero: products slider + optional image banners */}
      <div className="space-y-3">
        <div>
          <Label>بانر الواجهة / السلايدر</Label>
          <p className="text-xs text-muted-foreground mt-1">
            اختر بنفسك المنتجات التي تظهر في السلايدر، أو اترك الاختيار فارغاً لعرض أحدث المنتجات تلقائياً.
          </p>
        </div>

        <div className="space-y-2">
          <Label>نوع البانر</Label>
          <Select
            value={theme.hero_mode}
            onValueChange={(v) => setTheme((t) => ({ ...t, hero_mode: v as StoreHeroMode }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="products">سلايدر المنتجات (موصى به)</SelectItem>
              <SelectItem value="images">صور بانر فقط</SelectItem>
              <SelectItem value="both">منتجات + صور بانر</SelectItem>
              <SelectItem value="none">بدون بانر</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(theme.hero_mode === "products" || theme.hero_mode === "both") && (
          <div className="space-y-3">
            <div>
              <Label>اختر منتجات السلايدر</Label>
              <p className="text-xs text-muted-foreground mt-1">
                حدّد المنتجات التي تظهر في بانر الواجهة. رتّبها بالأسهم. حتى {MAX_PRODUCT_SLIDER} منتجات.
                إن لم تختر شيئاً تُعرض أحدث المنتجات تلقائياً.
              </p>
            </div>

            {theme.product_slider_ids.length > 0 && (
              <div className="space-y-1.5 rounded-md border p-2 bg-muted/20">
                <p className="text-xs font-medium px-1">
                  المحدد ({theme.product_slider_ids.length}/{MAX_PRODUCT_SLIDER}) — الترتيب كما في السلايدر
                </p>
                {theme.product_slider_ids.map((id, index) => {
                  const p = catalog.find((c) => c.id === id);
                  if (!p) return null;
                  const thumb = productThumb(p);
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5"
                    >
                      <span className="text-[10px] text-muted-foreground w-4 text-center shrink-0">
                        {index + 1}
                      </span>
                      {thumb ? (
                        <img src={thumb} alt="" className="h-9 w-9 rounded object-cover shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-sm truncate flex-1">{p.name}</span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={index === 0}
                          onClick={() => moveSliderProduct(id, -1)}
                          aria-label="أعلى"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={index === theme.product_slider_ids.length - 1}
                          onClick={() => moveSliderProduct(id, 1)}
                          aria-label="أسفل"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => tryToggleSliderProduct(id)}
                          aria-label="إزالة"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setTheme((t) => ({ ...t, product_slider_ids: [] }))}
                >
                  مسح الاختيار (عرض تلقائي)
                </Button>
              </div>
            )}

            {catalog.length === 0 ? (
              <p className="text-xs text-muted-foreground">لا توجد منتجات بعد — أضف منتجات من لوحة التحكم أولاً.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1 rounded-md border p-2">
                {catalog.map((p) => {
                  const checked = theme.product_slider_ids.includes(p.id);
                  const thumb = productThumb(p);
                  const disabled =
                    !checked && theme.product_slider_ids.length >= MAX_PRODUCT_SLIDER;
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-muted/50 ${
                        disabled ? "opacity-50 cursor-not-allowed" : ""
                      } ${!p.is_visible ? "opacity-70" : ""}`}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={() => {
                          if (!disabled || checked) tryToggleSliderProduct(p.id);
                        }}
                      />
                      {thumb ? (
                        <img src={thumb} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-sm truncate flex-1">{p.name}</span>
                      {!p.is_visible && (
                        <span className="text-[10px] text-muted-foreground shrink-0">مخفي</span>
                      )}
                      <span className="text-[11px] text-muted-foreground shrink-0" dir="ltr">
                        {Number(p.price).toLocaleString()}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {theme.product_slider_ids.length === 0 && (
              <div className="space-y-2">
                <Label htmlFor="sliderCount">عدد المنتجات التلقائي</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="sliderCount"
                    type="number"
                    min={MIN_PRODUCT_SLIDER}
                    max={MAX_PRODUCT_SLIDER}
                    value={theme.product_slider_count}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (!Number.isFinite(n)) return;
                      setTheme((t) => ({
                        ...t,
                        product_slider_count: Math.min(
                          MAX_PRODUCT_SLIDER,
                          Math.max(MIN_PRODUCT_SLIDER, n),
                        ),
                      }));
                    }}
                    className="w-24"
                    dir="ltr"
                  />
                  <span className="text-xs text-muted-foreground">
                    يُستخدم فقط عند عدم اختيار منتجات يدوياً
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              العرض على الشاشة: عريض ٤ · متوسط ٣ · صغير ٢ · جوال ١ (تمرير تلقائي).
            </p>
          </div>
        )}

        {(theme.hero_mode === "images" || theme.hero_mode === "both") && (
          <div className="space-y-2">
            <Label>صور بانر إضافية (اختياري)</Label>
            <p className="text-xs text-muted-foreground">
              صورة واحدة تظهر كبانر، وأكثر من صورة تظهر كسلايدر. حتى {MAX_STORE_BANNERS} صور.
            </p>
            {theme.banners.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {theme.banners.map((url, i) => (
                  <div key={url} className="relative aspect-[2/1] rounded-md overflow-hidden border bg-muted">
                    <img src={url} alt={`بانر ${i + 1}`} className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 left-1 h-6 w-6"
                      onClick={() => removeBanner(i)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {theme.banners.length < MAX_STORE_BANNERS && (
              <>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleBannerUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={uploading}
                  onClick={() => bannerInputRef.current?.click()}
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                  إضافة صورة بانر
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mini preview */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          background: theme.primary,
          fontFamily: `"${theme.font}", Cairo, sans-serif`,
        }}
      >
        <div className="px-4 py-3 text-center" style={{ color: "#fff" }}>
          <div className="flex items-center justify-center gap-2">
            {theme.logo_url ? (
              <img src={theme.logo_url} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : null}
            <span className="font-bold text-sm">معاينة المتجر</span>
          </div>
          <p className="text-[10px] opacity-80 mt-0.5">
            {theme.tagline || "تصفّح المنتجات واطلب مباشرة"}
          </p>
        </div>
        <div
          className="p-3 flex items-center justify-between gap-2"
          style={{
            background: `color-mix(in srgb, ${theme.primary} 12%, white)`,
            color: theme.primary,
          }}
        >
          <span className="text-xs font-bold" style={{ color: theme.accent }}>
            25,000 ل.س
          </span>
          <span
            className="text-[10px] px-2 py-1 rounded"
            style={{ background: theme.primary, color: "#fff" }}
          >
            اطلب الآن
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={saving || uploading} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ المظهر
        </Button>
        <Button type="button" variant="ghost" onClick={handleReset} className="gap-2" disabled={saving}>
          <RotateCcw className="h-4 w-4" />
          استعادة الافتراضي
        </Button>
      </div>
    </Card>
  );
};

export default StoreThemeSettings;
