import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast as sonnerToast } from "sonner";
import { Plus, Package, Loader2, Pencil, Trash2, ImagePlus, AlertTriangle, Share2, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Product } from "@/integrations/supabase/db-types";
import { useToast } from "@/hooks/use-toast";
import ProductImageCarousel from "@/components/ProductImageCarousel";

const FREE_PLAN_LIMIT = 10;
const MAX_IMAGES = 5;

const DashboardProducts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [planType, setPlanType] = useState<string>("free");
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("merchant_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "خطأ في جلب المنتجات", description: error.message, variant: "destructive" });
    } else {
      setProducts(data ?? []);
    }
    setLoading(false);
  };

  const fetchPlan = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("plan_type")
      .eq("id", user.id)
      .single();
    if (data) setPlanType((data as any).plan_type || "free");
  };

  useEffect(() => {
    fetchProducts();
    fetchPlan();
  }, [user]);

  const isFreePlan = planType === "free";
  const atLimit = isFreePlan && products.length >= FREE_PLAN_LIMIT;

  const resetForm = () => {
    setName("");
    setPrice("");
    setDescription("");
    setStockQuantity("");
    setEditingProduct(null);
    setImageFiles([]);
    setImagePreviews([]);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(String(product.price));
    setDescription(product.description || "");
    setStockQuantity(String(product.stock_quantity ?? 0));
    setImageFiles([]);
    const existing = product.images?.length ? product.images : product.image_url ? [product.image_url] : [];
    setImagePreviews(existing);
    setOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalAllowed = MAX_IMAGES - imagePreviews.length;
    const toAdd = files.slice(0, totalAllowed);

    for (const file of toAdd) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "الصورة كبيرة جداً", description: "الحد الأقصى 5 ميغابايت", variant: "destructive" });
        return;
      }
    }

    setImageFiles((prev) => [...prev, ...toAdd]);
    setImagePreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    if (e.target) e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    // Only remove from imageFiles if this index corresponds to a new file
    const existingCount = editingProduct
      ? (editingProduct.images?.length || (editingProduct.image_url ? 1 : 0))
      : 0;
    if (index >= existingCount) {
      setImageFiles((prev) => prev.filter((_, i) => i !== (index - existingCount)));
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const filePath = `${user!.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(filePath, file);
    if (error) {
      toast({ title: "فشل رفع الصورة", description: error.message, variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!user || !name.trim() || !price.trim()) {
      toast({ title: "يرجى تعبئة الاسم والسعر", variant: "destructive" });
      return;
    }

    setSaving(true);

    // Upload new image files
    const uploadedUrls: string[] = [];
    for (const file of imageFiles) {
      const url = await uploadImage(file);
      if (!url) { setSaving(false); return; }
      uploadedUrls.push(url);
    }

    // Combine existing kept images + newly uploaded
    const existingCount = editingProduct
      ? (editingProduct.images?.length || (editingProduct.image_url ? 1 : 0))
      : 0;
    const keptExisting = imagePreviews.slice(0, existingCount).filter((url) => !url.startsWith("blob:"));
    const allImages = [...keptExisting, ...uploadedUrls];

    const stock = parseInt(stockQuantity) || 0;

    if (editingProduct) {
      const updateData: Record<string, unknown> = {
        name: name.trim(),
        price: parseFloat(price),
        description: description.trim() || null,
        stock_quantity: stock,
        images: allImages,
        image_url: allImages[0] || null,
      };

      const { data: updatedRows, error } = await (supabase.from("products") as any)
        .update(updateData)
        .eq("id", editingProduct.id)
        .select();

      if (error) {
        toast({ title: "خطأ في التحديث", description: error.message, variant: "destructive" });
      } else if (!updatedRows || updatedRows.length === 0) {
        toast({ title: "تم حظر التحديث", description: "تحقق من سياسات RLS.", variant: "destructive" });
      } else {
        toast({ title: "تم تحديث المنتج! ✅" });
      }
    } else {
      const insertData = {
        name: name.trim(),
        price: parseFloat(price),
        description: description.trim() || null,
        merchant_id: user.id,
        stock_quantity: stock,
        images: allImages,
        image_url: allImages[0] || null,
      };

      const { error } = await (supabase.from("products") as any)
        .insert(insertData)
        .select();

      if (error) {
        toast({ title: "خطأ في الإضافة", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "تمت إضافة المنتج! ✅" });
      }
    }

    resetForm();
    setOpen(false);
    fetchProducts();
    setSaving(false);
  };

  const handleDelete = async (deletedId: string) => {
    if (!user) {
      sonnerToast.error("يجب تسجيل الدخول أولاً");
      return;
    }

    const previousProducts = products;
    setProducts((current) => current.filter((product) => product.id !== deletedId));

    try {
      const { data: deletedRows, error } = await (supabase.from("products") as any)
        .delete()
        .eq("id", deletedId)
        .eq("merchant_id", user.id)
        .select("id");

      if (error) {
        setProducts(previousProducts);
        const isFKError = error.message?.toLowerCase().includes("foreign key") ||
          error.message?.toLowerCase().includes("violates") ||
          error.code === "23503";
        if (isFKError) {
          sonnerToast.error("لا يمكن حذف المنتج لأنه مرتبط بطلبات سابقة، يمكنك إخفاؤه بدلاً من الحذف.");
        } else {
          sonnerToast.error(error.message);
        }
        return;
      }

      const deleted = Array.isArray(deletedRows) && deletedRows.some((row) => row.id === deletedId);
      if (!deleted) {
        // Hard delete blocked (RLS or FK) — fallback to soft delete (hide)
        const { error: hideError } = await (supabase.from("products") as any)
          .update({ is_visible: false })
          .eq("id", deletedId)
          .eq("merchant_id", user.id);

        if (hideError) {
          setProducts(previousProducts);
          sonnerToast.error("فشل الحذف والإخفاء. تحقق من صلاحيات قاعدة البيانات.");
        } else {
          setProducts(previousProducts.map((p) => p.id === deletedId ? { ...p, is_visible: false } : p));
          toast({ title: "تم إخفاء المنتج بدلاً من حذفه (مرتبط بطلبات) 🙈" });
        }
        return;
      }

      toast({ title: "تم حذف المنتج نهائياً ✅" });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      fetchProducts();
    } catch (error) {
      setProducts(previousProducts);
      sonnerToast.error(error instanceof Error ? error.message : "حدث خطأ غير متوقع");
    }
  };

  const handleToggleVisibility = async (product: Product) => {
    const newVisible = !(product.is_visible ?? true);
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, is_visible: newVisible } : p));
    const { error } = await (supabase.from("products") as any)
      .update({ is_visible: newVisible })
      .eq("id", product.id);
    if (error) {
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, is_visible: !newVisible } : p));
      sonnerToast.error(error.message);
    } else {
      toast({ title: newVisible ? "المنتج مرئي الآن ✅" : "تم إخفاء المنتج 🙈" });
    }
  };

  const handleShare = (product: Product) => {
    const url = `${window.location.origin}/s/${user?.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "تم نسخ رابط المتجر! ✅" });
  };

  return (
    <div className="space-y-4">
      {atLimit && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-sm font-medium">
            لقد وصلت للحد الأقصى للباقة المجانية ({FREE_PLAN_LIMIT} منتجات). يرجى الترقية لإضافة المزيد.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">المنتجات</h1>
          <p className="text-sm text-muted-foreground">{products.length} / {isFreePlan ? FREE_PLAN_LIMIT : "∞"} منتج</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button
              disabled={atLimit && !editingProduct}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full gap-1.5 font-semibold shadow-lg shadow-secondary/25"
            >
              <Plus className="h-4 w-4" />
              إضافة منتج
            </Button>
          </DialogTrigger>
          <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                {editingProduct ? "تعديل المنتج" : "منتج جديد"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="name">اسم المنتج</Label>
                <Input id="name" placeholder="مثال: صابون حلبي" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">السعر (ل.س)</Label>
                <Input id="price" type="number" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">الكمية المتوفرة</Label>
                <Input id="stock" type="number" placeholder="0" min="0" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">الوصف</Label>
                <Textarea id="desc" placeholder="وصف المنتج..." rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>صور المنتج ({imagePreviews.length}/{MAX_IMAGES})</Label>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-md overflow-hidden border">
                        <img src={src} alt={`صورة ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-0.5 left-0.5 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {imagePreviews.length < MAX_IMAGES && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:border-secondary/50 transition-colors"
                  >
                    <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
                    <span className="text-xs text-muted-foreground">اضغط لرفع صور (حد أقصى 5 ميغابايت لكل صورة)</span>
                  </div>
                )}
              </div>
              <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                {editingProduct ? "حفظ التعديلات" : "إضافة المنتج"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">لا توجد منتجات بعد</p>
          <p className="text-sm">اضغط "إضافة منتج" للبدء</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {products.map((product) => {
            const outOfStock = (product.stock_quantity ?? 0) <= 0;
            const isHidden = !(product.is_visible ?? true);
            return (
              <Card key={product.id} className={`p-3 space-y-2 hover:shadow-md transition-shadow relative ${isHidden ? "opacity-60" : ""}`}>
                {outOfStock && (
                  <Badge variant="destructive" className="absolute top-2 right-2 z-10 text-[10px]">
                    نفذت الكمية
                  </Badge>
                )}
                {isHidden && (
                  <Badge variant="secondary" className="absolute top-2 left-2 z-10 text-[10px]">
                    مخفي
                  </Badge>
                )}
                <ProductImageCarousel
                  images={product.images || []}
                  imageUrl={product.image_url}
                  alt={product.name}
                  className="aspect-square rounded-lg"
                />
                <div>
                  <h3 className="font-semibold text-sm leading-tight">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 whitespace-pre-line">{product.description}</p>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-display font-bold text-sm text-foreground">{Number(product.price).toLocaleString()} ل.س</span>
                  <span>المخزون: {product.stock_quantity ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleVisibility(product)} title={isHidden ? "إظهار" : "إخفاء"}>
                      {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleShare(product)}>
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>حذف المنتج؟</AlertDialogTitle>
                          <AlertDialogDescription>
                            سيتم محاولة الحذف النهائي. إذا كان المنتج مرتبطاً بطلبات سابقة سيتم إخفاؤه تلقائياً بدلاً من الحذف.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-row-reverse gap-2">
                          <AlertDialogAction onClick={() => handleDelete(product.id)}>حذف نهائي</AlertDialogAction>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardProducts;
