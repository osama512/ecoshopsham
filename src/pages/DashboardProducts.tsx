import { useState, useEffect, useRef } from "react";
import { Plus, Package, Loader2, Pencil, Trash2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Product } from "@/integrations/supabase/db-types";
import { useToast } from "@/hooks/use-toast";

const DashboardProducts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
      toast({ title: "Error fetching products", description: error.message, variant: "destructive" });
    } else {
      setProducts(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const resetForm = () => {
    setName("");
    setPrice("");
    setDescription("");
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(String(product.price));
    setDescription(product.description || "");
    setImageFile(null);
    setImagePreview(product.image_url || null);
    setOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const filePath = `${user!.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(filePath, file);
    if (error) {
      console.error("Upload error:", error);
      toast({ title: "Image upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!user || !name.trim() || !price.trim()) {
      toast({ title: "Please fill in name and price", variant: "destructive" });
      return;
    }

    setSaving(true);

    let imageUrl: string | null | undefined = undefined;
    if (imageFile) {
      const url = await uploadImage(imageFile);
      if (url) imageUrl = url;
      else { setSaving(false); return; }
    }

    if (editingProduct) {
      const updateData: Record<string, unknown> = {
        name: name.trim(),
        price: parseFloat(price),
        description: description.trim() || null,
      };
      if (imageUrl !== undefined) updateData.image_url = imageUrl;

      const { error } = await (supabase.from("products") as any)
        .update(updateData)
        .eq("id", editingProduct.id);

      if (error) {
        toast({ title: "Error updating", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Product updated!" });
      }
    } else {
      const { error } = await supabase.from("products").insert({
        name: name.trim(),
        price: parseFloat(price),
        description: description.trim() || null,
        merchant_id: user.id,
        ...(imageUrl ? { image_url: imageUrl } : {}),
      } as any);

      if (error) {
        toast({ title: "Error adding", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Product added!" });
      }
    }

    resetForm();
    setOpen(false);
    fetchProducts();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Product deleted" });
      fetchProducts();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">{products.length} items listed</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full gap-1.5 font-semibold shadow-lg shadow-secondary/25">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                {editingProduct ? "Edit Product" : "New Product"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input id="name" placeholder="e.g. Aleppo Soap" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (SYP)</Label>
                <Input id="price" type="number" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" placeholder="Describe your product..." rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Product Image</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:border-secondary/50 transition-colors"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-md" />
                  ) : (
                    <>
                      <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
                      <span className="text-xs text-muted-foreground">Click to upload image (max 5MB)</span>
                    </>
                  )}
                </div>
              </div>
              <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingProduct ? "Save Changes" : "Add Product"}
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
          <p className="font-medium">No products yet</p>
          <p className="text-sm">Tap "Add Product" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {products.map((product) => (
            <Card key={product.id} className="p-3 space-y-2 hover:shadow-md transition-shadow">
              <div className="aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">{product.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{product.description}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-sm">{Number(product.price).toLocaleString()} SYP</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(product.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardProducts;
