import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Plus, Trash2, FileText, Share2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createFooterPage,
  createSocialLink,
  DEFAULT_STORE_FOOTER,
  MAX_FOOTER_PAGES,
  MAX_FOOTER_SOCIALS,
  parseStoreTheme,
  STORE_SOCIAL_PLATFORMS,
  type StoreFooter,
  type StoreSocialPlatform,
} from "@/lib/storeTheme";

const RETURN_POLICY_TEMPLATE =
  "سياسة الاستبدال والاسترجاع:\n\n1. يمكن استبدال أو إرجاع المنتج خلال مدة يحددها المتجر من تاريخ الاستلام.\n2. يجب أن يكون المنتج بحالته الأصلية مع التغليف.\n3. لا يشمل الاستبدال/الاسترجاع المنتجات التالفة بسبب سوء الاستخدام.\n4. للاستفسار تواصل معنا عبر وسائل التواصل أو واتساب.";

const StoreFooterSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [footer, setFooter] = useState<StoreFooter>({ ...DEFAULT_STORE_FOOTER, socials: [], pages: [] });

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("store_settings" as any)
        .select("theme")
        .eq("merchant_id", userId)
        .maybeSingle();

      if (data) {
        const theme = parseStoreTheme((data as any).theme);
        setFooter({
          about: theme.footer.about,
          socials: theme.footer.socials,
          pages: theme.footer.pages,
        });
      }
      setLoading(false);
    };

    fetch();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const cleaned: StoreFooter = {
      about: footer.about?.trim() || null,
      socials: footer.socials
        .map((s) => ({ ...s, url: s.url.trim(), label: s.label.trim() || s.platform }))
        .filter((s) => !!s.url)
        .slice(0, MAX_FOOTER_SOCIALS),
      pages: footer.pages
        .map((p) => ({
          ...p,
          title: p.title.trim() || "صفحة",
          content: p.content.trim(),
          slug: p.slug.trim() || p.id.slice(0, 8),
        }))
        .filter((p) => !!p.title)
        .slice(0, MAX_FOOTER_PAGES),
    };

    const { data: existing } = await supabase
      .from("store_settings" as any)
      .select("theme")
      .eq("merchant_id", user.id)
      .maybeSingle();

    const currentTheme = parseStoreTheme((existing as any)?.theme);
    const nextTheme = { ...currentTheme, footer: cleaned };

    const { error } = await (supabase.from("store_settings") as any).upsert(
      {
        merchant_id: user.id,
        theme: nextTheme,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "merchant_id" },
    );

    if (error) {
      toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم حفظ الفوتر! ✅" });
      setFooter(cleaned);
    }
    setSaving(false);
  };

  const addReturnPolicy = () => {
    const exists = footer.pages.some((p) => p.slug === "returns" || p.title.includes("استبدال"));
    if (exists) {
      toast({ title: "صفحة السياسات موجودة مسبقاً" });
      return;
    }
    const page = createFooterPage(
      "سياسات الاستبدال والاسترجاع",
      RETURN_POLICY_TEMPLATE,
      footer.pages.map((p) => p.slug),
    );
    page.slug = "returns";
    setFooter((f) => ({
      ...f,
      pages: [...f.pages, page],
    }));
  };

  if (loading) {
    return (
      <Card className="p-5 flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-5">
      <div>
        <h2 className="font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-secondary" />
          فوتر المتجر
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          نبذة عن المتجر، روابط السوشيال ميديا، وصفحات مثل سياسات الاستبدال والاسترجاع وصفحات أخرى.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="aboutStore">نبذة عن المتجر</Label>
        <Textarea
          id="aboutStore"
          rows={4}
          placeholder="اكتب تعريفاً قصيراً عن متجرك يظهر في الفوتر..."
          value={footer.about || ""}
          onChange={(e) => setFooter((f) => ({ ...f, about: e.target.value }))}
          maxLength={800}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="flex items-center gap-1.5">
            <Share2 className="h-3.5 w-3.5" />
            صفحات السوشيال ميديا
          </Label>
          {footer.socials.length < MAX_FOOTER_SOCIALS && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() =>
                setFooter((f) => ({
                  ...f,
                  socials: [...f.socials, createSocialLink("instagram")],
                }))
              }
            >
              <Plus className="h-3.5 w-3.5" />
              إضافة
            </Button>
          )}
        </div>

        {footer.socials.length === 0 && (
          <p className="text-xs text-muted-foreground">لا توجد روابط بعد. أضف فيسبوك أو انستغرام وغيرها.</p>
        )}

        <div className="space-y-2">
          {footer.socials.map((social) => (
            <div key={social.id} className="flex flex-col sm:flex-row gap-2 rounded-md border p-2">
              <Select
                value={social.platform}
                onValueChange={(v) =>
                  setFooter((f) => ({
                    ...f,
                    socials: f.socials.map((s) =>
                      s.id === social.id
                        ? {
                            ...s,
                            platform: v as StoreSocialPlatform,
                            label:
                              STORE_SOCIAL_PLATFORMS.find((p) => p.id === v)?.label || s.label,
                          }
                        : s,
                    ),
                  }))
                }
              >
                <SelectTrigger className="sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORE_SOCIAL_PLATFORMS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="https://..."
                value={social.url}
                onChange={(e) =>
                  setFooter((f) => ({
                    ...f,
                    socials: f.socials.map((s) =>
                      s.id === social.id ? { ...s, url: e.target.value } : s,
                    ),
                  }))
                }
                dir="ltr"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive shrink-0"
                onClick={() =>
                  setFooter((f) => ({
                    ...f,
                    socials: f.socials.filter((s) => s.id !== social.id),
                  }))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>صفحات الفوتر (سياسات، روابط معلومات…)</Label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addReturnPolicy}>
              قالب الاستبدال والاسترجاع
            </Button>
            {footer.pages.length < MAX_FOOTER_PAGES && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  setFooter((f) => ({
                    ...f,
                    pages: [
                      ...f.pages,
                      createFooterPage("صفحة جديدة", "", f.pages.map((p) => p.slug)),
                    ],
                  }))
                }
              >
                <Plus className="h-3.5 w-3.5" />
                إضافة صفحة
              </Button>
            )}
          </div>
        </div>

        {footer.pages.length === 0 && (
          <p className="text-xs text-muted-foreground">
            أضف صفحة سياسات الاستبدال والاسترجاع أو أي صفحة أخرى تظهر كرابط في الفوتر.
          </p>
        )}

        {footer.pages.map((page) => (
          <div key={page.id} className="space-y-2 rounded-md border p-3">
            <div className="flex gap-2">
              <Input
                value={page.title}
                onChange={(e) =>
                  setFooter((f) => ({
                    ...f,
                    pages: f.pages.map((p) =>
                      p.id === page.id ? { ...p, title: e.target.value } : p,
                    ),
                  }))
                }
                placeholder="عنوان الصفحة"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive shrink-0"
                onClick={() =>
                  setFooter((f) => ({
                    ...f,
                    pages: f.pages.filter((p) => p.id !== page.id),
                  }))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Input
              value={page.slug}
              onChange={(e) => {
                const slug = e.target.value
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9\u0600-\u06FF-]/g, "");
                setFooter((f) => ({
                  ...f,
                  pages: f.pages.map((p) => (p.id === page.id ? { ...p, slug } : p)),
                }));
              }}
              placeholder="slug-الرابط"
              dir="ltr"
              className="font-mono text-xs"
            />
            <Textarea
              rows={5}
              value={page.content}
              onChange={(e) =>
                setFooter((f) => ({
                  ...f,
                  pages: f.pages.map((p) =>
                    p.id === page.id ? { ...p, content: e.target.value } : p,
                  ),
                }))
              }
              placeholder="محتوى الصفحة يظهر للزبائن عند فتح الرابط..."
            />
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        حفظ الفوتر
      </Button>
    </Card>
  );
};

export default StoreFooterSettings;
