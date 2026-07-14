import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/integrations/supabase/db-types";
import { useState } from "react";

interface AddToCartControlsProps {
  product: Product;
  /** compact for grid cards */
  compact?: boolean;
  className?: string;
}

const AddToCartControls = ({ product, compact, className = "" }: AddToCartControlsProps) => {
  const { addItem, setCartOpen } = useCart();
  const { toast } = useToast();
  const stock = product.stock_quantity ?? 0;
  const outOfStock = stock <= 0;
  const [qty, setQty] = useState(1);

  const clamp = (n: number) => Math.max(1, Math.min(stock || 1, n));

  const handleAdd = () => {
    const result = addItem(product, compact ? 1 : qty);
    if (!result.ok) {
      toast({ title: result.message || "تعذّر الإضافة", variant: "destructive" });
      return;
    }
    toast({ title: "تمت الإضافة إلى السلة ✅" });
    if (!compact) setCartOpen(true);
  };

  if (outOfStock) {
    return (
      <Button className={`w-full ${className}`} size={compact ? "sm" : "default"} disabled>
        نفذت الكمية
      </Button>
    );
  }

  if (compact) {
    return (
      <Button
        className={`w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold ${className}`}
        size="sm"
        onClick={handleAdd}
      >
        أضف إلى السلة
      </Button>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => setQty((q) => clamp(q - 1))}
          disabled={qty <= 1}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="font-display font-bold text-lg w-8 text-center tabular-nums">{qty}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => setQty((q) => clamp(q + 1))}
          disabled={qty >= stock}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-center text-muted-foreground">المتوفر: {stock}</p>
      <Button
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-5"
        onClick={handleAdd}
      >
        أضف إلى السلة
      </Button>
    </div>
  );
};

export default AddToCartControls;
