import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Product } from "@/integrations/supabase/db-types";
import ProductImageCarousel from "@/components/ProductImageCarousel";
import { formatStorePrice, type StoreCurrency } from "@/lib/currency";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

interface ProductBannerSliderProps {
  products: Product[];
  currency: StoreCurrency;
  onOpenProduct: (product: Product) => void;
  onOrder: (product: Product) => void;
}

const ProductBannerSlider = ({ products, currency, onOpenProduct, onOrder }: ProductBannerSliderProps) => {
  const [api, setApi] = useState<CarouselApi>();

  if (!products.length) return null;

  return (
    <section className="w-full border-b border-border py-3 sm:py-4">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 relative">
        <p className="text-xs text-muted-foreground mb-2 px-1">منتجات مميزة</p>
        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: false, direction: "rtl" }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 sm:-ml-3">
            {products.map((product) => {
              const outOfStock = (product.stock_quantity ?? 0) <= 0;
              return (
                <CarouselItem
                  key={product.id}
                  className="pl-2 sm:pl-3 basis-full sm:basis-1/2 md:basis-1/3 xl:basis-1/4"
                >
                  <Card className="overflow-hidden flex flex-col relative h-full">
                    {outOfStock && (
                      <Badge variant="destructive" className="absolute top-2 right-2 z-10 text-[10px]">
                        نفذت الكمية
                      </Badge>
                    )}
                    <div className="cursor-pointer" onClick={() => onOpenProduct(product)}>
                      <ProductImageCarousel
                        images={product.images || []}
                        imageUrl={product.image_url}
                        alt={product.name}
                        className="aspect-square"
                      />
                    </div>
                    <div className="p-3 flex flex-col flex-1 gap-2">
                      <h3
                        className="font-semibold text-sm leading-tight cursor-pointer hover:text-secondary transition-colors"
                        onClick={() => onOpenProduct(product)}
                      >
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">
                          {product.description}
                        </p>
                      )}
                      <span className="font-display font-bold text-sm text-secondary mt-auto">
                        {formatStorePrice(Number(product.price), currency)}
                      </span>
                      <Button
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 text-xs font-semibold"
                        size="sm"
                        onClick={() => onOrder(product)}
                        disabled={outOfStock}
                      >
                        {outOfStock ? "نفذت الكمية" : "أضف إلى السلة"}
                      </Button>
                    </div>
                  </Card>
                </CarouselItem>
              );
            })}
          </CarouselContent>

          {products.length > 1 && (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute right-0 sm:right-1 top-[42%] -translate-y-1/2 h-8 w-8 rounded-full bg-background/90 z-10 shadow-sm hidden sm:flex"
                onClick={() => api?.scrollPrev()}
                aria-label="السابق"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute left-0 sm:left-1 top-[42%] -translate-y-1/2 h-8 w-8 rounded-full bg-background/90 z-10 shadow-sm hidden sm:flex"
                onClick={() => api?.scrollNext()}
                aria-label="التالي"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          )}
        </Carousel>
      </div>
    </section>
  );
};

export default ProductBannerSlider;
