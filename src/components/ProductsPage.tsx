import { useState, useEffect } from "react";
import { Plus, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/integrations/supabase/db-types";
import { useToast } from "@/hooks/use-toast";

const MOCK_MERCHANT_ID = "00000000-0000-0000-0000-000000000001";

const ProductsPage = () => {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [inserting, setInserting] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
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
  }, []);

  const handleAddProduct = async () => {
    if (!name.trim() || !price.trim()) {
      toast({ title: "Please fill in name and price", variant: "destructive" });
      return;
    }

    setInserting(true);
    const { error } = await supabase.from("products").insert({
      name: name.trim(),
      price: parseFloat(price),
      description: description.trim() || null,
      merchant_id: MOCK_MERCHANT_ID,
    });

    if (error) {
      toast({ title: "Error adding product", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Product added!" });
      setName("");
      setPrice("");
      setDescription("");
      setOpen(false);
      fetchProducts();
    }
    setInserting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">{products.length} items listed</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full gap-1.5 font-semibold shadow-lg shadow-secondary/25">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">New Product</DialogTitle>
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
              <Button
                className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold"
                onClick={handleAddProduct}
                disabled={inserting}
              >
                {inserting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Product
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
        <div className="grid grid-cols-2 gap-3">
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
              <span className="font-display font-bold text-sm">{Number(product.price).toLocaleString()} SYP</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
