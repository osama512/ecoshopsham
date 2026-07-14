import { ShoppingCart, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { useCart } from "@/contexts/CartContext";
import { formatStorePrice, type StoreCurrency } from "@/lib/currency";

interface StoreCartButtonProps {
  currency: StoreCurrency;
  onCheckout: () => void;
}

export function StoreCartButton({ currency, onCheckout }: StoreCartButtonProps) {
  const { totalCount, cartOpen, setCartOpen, items, setQuantity, removeItem, subtotal } = useCart();

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="relative gap-1.5 bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25 border-0"
        onClick={() => setCartOpen(true)}
        aria-label="سلة المشتريات"
      >
        <ShoppingCart className="h-4 w-4" />
        <span className="hidden sm:inline text-xs">السلة</span>
        {totalCount > 0 && (
          <Badge className="absolute -top-2 -left-2 h-5 min-w-5 px-1 justify-center bg-secondary text-secondary-foreground text-[10px]">
            {totalCount}
          </Badge>
        )}
      </Button>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="left" className="flex flex-col w-full sm:max-w-md" dir="rtl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              سلة المشتريات
              {totalCount > 0 && (
                <Badge variant="secondary">{totalCount}</Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">السلة فارغة</p>
            ) : (
              items.map((item) => (
                <div key={item.productId} className="flex gap-3 rounded-lg border p-2">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-16 w-16 rounded-md object-cover shrink-0 bg-muted"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-md bg-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-semibold line-clamp-2">{item.name}</p>
                    <p className="text-xs text-secondary font-bold">
                      {formatStorePrice(item.price, currency)}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setQuantity(item.productId, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-bold w-6 text-center tabular-nums">
                        {item.quantity}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive mr-auto"
                        onClick={() => removeItem(item.productId)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <SheetFooter className="flex-col gap-3 sm:flex-col border-t pt-4">
              <div className="flex justify-between items-center w-full text-sm font-bold">
                <span>المجموع</span>
                <span className="text-secondary font-display">
                  {formatStorePrice(subtotal, currency)}
                </span>
              </div>
              <Button
                className="w-full bg-primary text-primary-foreground"
                onClick={() => {
                  setCartOpen(false);
                  onCheckout();
                }}
              >
                إتمام الطلب
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
