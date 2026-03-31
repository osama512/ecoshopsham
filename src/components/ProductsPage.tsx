import { useState } from "react";
import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const mockProducts = [
  { id: 1, name: "Aleppo Soap", price: 4500, description: "Traditional olive oil soap", category: "Beauty" },
  { id: 2, name: "Damascus Rose Water", price: 3200, description: "Pure natural rose water", category: "Beauty" },
  { id: 3, name: "Halawa Tahini", price: 6000, description: "Premium sesame halawa", category: "Food" },
  { id: 4, name: "Handmade Mosaic Lamp", price: 35000, description: "Traditional Syrian mosaic lamp", category: "Home" },
  { id: 5, name: "Spice Mix Bundle", price: 8500, description: "7 essential Syrian spices", category: "Food" },
  { id: 6, name: "Embroidered Tablecloth", price: 22000, description: "Hand-embroidered cotton cloth", category: "Home" },
];

const ProductsPage = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">{mockProducts.length} items listed</p>
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
                <Input id="name" placeholder="e.g. Aleppo Soap" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (SYP)</Label>
                <Input id="price" type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" placeholder="Describe your product..." rows={3} />
              </div>
              <Button
                className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold"
                onClick={() => setOpen(false)}
              >
                Add Product
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {mockProducts.map((product) => (
          <Card key={product.id} className="p-3 space-y-2 hover:shadow-md transition-shadow">
            <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight">{product.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{product.description}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-sm">{product.price.toLocaleString()} SYP</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground">{product.category}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProductsPage;
