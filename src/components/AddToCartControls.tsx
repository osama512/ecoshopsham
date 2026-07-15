import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/integrations/supabase/db-types";

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
    const result = addItem(product, qty);
    if (!result.ok) {
      toast({ title: result.message || "تعذّر الإضافة", variant: "destructive" });
      return;
    }
    toast({ title: `تمت إضافة ${qty} إلى السلة ✅` });
    if (!compact) setCartOpen(true);
  };

  if (outOfStock) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="rounded-md bg-muted px-2 py-2 text-center text-xs font-semibold text-muted-foreground border border-dashed">
          غير متوفر
        </div>
        <Button className="w-full" size={compact ? "sm" : "default"} disabled>
          غير متوفر
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className={`flex items-center ${compact ? "justify-between gap-2" : "justify-center gap-3"}`}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={compact ? "h-8 w-8 shrink-0" : "h-9 w-9"}
          onClick={() => setQty((q) => clamp(q - 1))}
          disabled={qty <= 1}
          aria-label="إنقاص الكمية"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <div className="text-center min-w-[2.5rem]">
          <span className={`font-display font-bold tabular-nums ${compact ? "text-sm" : "text-lg"}`}>
            {qty}
          </span>
          {!compact && (
            <p className="text-[10px] text-muted-foreground">المتوفر: {stock}</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={compact ? "h-8 w-8 shrink-0" : "h-9 w-9"}
          onClick={() => setQty((q) => clamp(q + 1))}
          disabled={qty >= stock}
          aria-label="زيادة الكمية"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {compact && (
        <p className="text-[10px] text-center text-muted-foreground">متوفر: {stock}</p>
      )}
      <Button
        className={`w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold ${
          compact ? "text-xs" : "py-5"
        }`}
        size={compact ? "sm" : "default"}
        onClick={handleAdd}
      >
        أضف إلى السلة
      </Button>
    </div>
  );
};

export default AddToCartControls;
